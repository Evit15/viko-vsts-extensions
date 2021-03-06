# Parallel Builds extension

Parallel Builds extension provides tasks to start builds in parallel, wait for them to finish and consume their test results. It also contains AutoDefects task to automatically create defects from the failed test run results.

## Parallel Builds tasks
The extenstion provides two task to manage parallel/chain builds. Tasks use "internal" connection, so you dont't need to specify any auth parameters 


1. Chain Builds Starter
The task starts build from the buildList parameter. The __buildList__ is the comma-separated list of the build definitions to start. 
You can specify either full build definition name (using full build folder name - e.g. /buildfolder1/builddef ) or just definition name (builddef). 
* If you specify the full name than only that build definition will queue a new build. 
* If you specify name only, than __Starter_ will start build definition with that name from all folders. 
The __Starter__ queues builds using their default settings.

2. Chain Builds Awaiter. 
The task awaits all build to finish. Once a build is finished its test runs results (if any) are published to the current build with the same name. 
It adds the links to the original builds to the current build summary page. It also creates "synthetic" test run called "Builds" that represents original builds as tests. 

## Auto defects
The Auto Defects task loads all test runs of the curren build and creates defects in the current project using the following rules:

* Bug Project - current build's project
* State - New
* Title - Failed _[failed test name]_
* Tags - AutoTestFailure; AutoBug; _buildNumber_; _testRunName_ ;
* ReproSteps - _testCaseErrorMessage_ _testCaseStackTrace_ 
* AssignedTo - username for the currentTestRun from assignees file
* other mandatory fields. It uses values from assignees file

Task parameters: 

* assignees file. The file contains the hash of the assignees - key is the name of the testRun, value - username to assign a Bug (simple format) or an object containg username to assign a bug to and a hash of the values of the mandatory fields (complex format)

__Simple format__
```json
{
    "Run1" : "User1",
    "Run2": "User2",
    "default": "User1"
}
``` 

__Complex format__
```json
{
    "Run1" : {
        "user": "User1",
        "mandatoryFields": {
            "Field1" : "val1.1",
            "Field2" : "val1.2",
        }
    },
    "Run2": {
        "user": "User2",
        "mandatoryFields": {
            "Field1" : "val2.1",
            "Field2" : "val2.2",
            }
        },
    "default": {
        "user": "User1",
        "mandatoryFields": {
            "Field1" : "val1.1",
            "Field2" : "val1.2",
        }
    }
}
``` 


If the hash doesn't have a key for the run being processed then the bug is assigned to the "default" username

* Authentication parameters to connect to the . Task accepts several authentication types. - OAuth, NTLM, Basic 
    * Authentication types
    * Username and Password for the Basic and NTLM authentication types.

