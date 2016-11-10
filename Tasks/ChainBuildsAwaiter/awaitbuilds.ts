import tl = require('vsts-task-lib/task');
import trm = require('vsts-task-lib/toolrunner');
import ents = require('html-entities');
import path = require('path');
import fs = require('fs');

import Q = require("q");

import * as vm from 'vso-node-api';
import {ApiHelper} from 'vsts-specflow/apihelper';
import {Feature,Scenario} from  'vsts-specflow/specflow';
import * as bi from 'vso-node-api/interfaces/BuildInterfaces';
import * as ci from 'vso-node-api/interfaces/CoreInterfaces';
import * as ti from 'vso-node-api/interfaces/TestInterfaces';
import * as wi from 'vso-node-api/interfaces/WorkItemTrackingInterfaces';

let trx = require('node-trx');  


var buildList = [];
var buildDefinitions = [];

let apihelper = new ApiHelper();
let api = apihelper.getApi();
var projId = null;
let testPublisher  = new tl.TestPublisher("VSTest");

async function processTestRun(testRun:ti.TestRun) {
    var testResults = await api.getTestApi().getTestResults(projId,testRun.id);
    var run = new trx.TestRun({name: testRun.name,
        times: {creation: testRun.createdDate.toISOString(),
                start: testRun.startedDate.toISOString(),
                queuing: testRun.createdDate.toISOString(), 
                finish: testRun.completedDate.toISOString()
            }});
    for(var tres of testResults) {
        run.addResult({test: new trx.UnitTest({
                name: tres.testCase.name,
                methodName: tres.automatedTestName,
                methodCodeBase: tres.automatedTestStorage,
                methodClassName: tres.automatedTestName,
                description: tres.comment            
            }),
            computerName: tres.computerName,
            outcome:tres.outcome,
            duration: new Date(tres.durationInMs).toTimeString(),
            errorMessage: tres.errorMessage,
            errorStackTrace: tres.stackTrace,
            startTime: tres.startedDate.toISOString(),
            endTime: tres.completedDate.toISOString()            
        });
    }
    var filepath = path.join(tl.getVariable("Agent.BuildDirectory"),`${testRun.name}-${testRun.id}.trx`);
    fs.writeFileSync(filepath,run.toXml());
    testPublisher.publish(filepath,"false",testRun.buildConfiguration.platform,testRun.buildConfiguration.flavor,testRun.name,"false");
}

async function processBuilds(buildList: number[]) : Promise<number[]>{
    let bapi = api.getBuildApi();
    var remainBuilds:number[] = []
    for(var buildId of buildList) {
        let build = await bapi.getBuild(buildId,projId);
        if(build.status!=bi.BuildStatus.Completed) {
            remainBuilds.push(buildId);
            continue;
        }
        //build completed store results
        console.log(tl.loc("loc.messages.processingBuild",build.definition.name));
        var testRuns = await api.getTestApi().getTestRuns(projId,`vstfs:///Build/Build/${buildId}`);
        for(var testRun of testRuns) {
            console.log(tl.loc("loc.messages.processingRun",testRun.name));
            var testRunDetailed = await api.getTestApi().getTestRunById(projId,testRun.id); 
            processTestRun(testRunDetailed); 
        }
    }
    return remainBuilds;    
}

async function run() {
    tl.setResourcePath(path.join(__dirname, 'task.json'));
    projId = tl.getVariable("System.TeamProjectId");
    let strBuildList = tl.getVariable("queuedBuilds");

    if(strBuildList==null) throw new Error("queuedBuilds initialization error. Check that Chain Builds Starter present in the build before the Awaiter");

    console.log(tl.loc("loc.messages.queuedBuilds",strBuildList));
    try {
        var buildList = strBuildList.split(",").map(e => Number.parseInt(e));
        let bapi = api.getBuildApi();
        while(buildList.length>0) {
            buildList = await processBuilds(buildList);
            console.log(tl.loc("loc.messages.buildsToWait",buildList.length));
            if(buildList.length>0) {
                console.log(tl.loc("loc.messages.sleeping",30));
                await new Promise(resolve => setTimeout(resolve,30000));
            }
        }
    } catch (err) {
        console.log(err);
        tl.debug(err.stack);
        throw err;        
    }


}


//tl.setVariable("System.TeamProjectId","40e8bc90-32fa-48f4-b43a-446f8ec3f084");
//tl.setVariable("queuedBuilds","10716");
//tl.setVariable("Agent.BuildDirectory","/dev/temp/");

run()
.then(r => tl.setResult(tl.TaskResult.Succeeded,tl.loc("loc.message.taskSucceeded")))
.catch(r => tl.setResult(tl.TaskResult.Failed,tl.loc("loc.message.taskFailed")))
