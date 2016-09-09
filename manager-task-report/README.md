#Manager Task Report


This report shows a summary of Tasks for the criteria selected.  Criteria may include: 
* Release 
    -  The release for the User Story that the Task is associated with.  
* Manager 
    -  This is the manager to show the task summary for.  The summary will show all employees that are either Owners of tasks for the selected release or milestone OR are managers of employees that Own tasks for the selected Release or Milestone.   
* Milestones 
    - If selected, only tasks will be shown for the User Stories associated with the selected Milestone(s)

The Summary grid shows all employees (with tasks) that report up into the selected Manager.  It also includes the following Task Summary information: 
*  # Tasks in Defined, In-Progress and Completed states
*  Total Task Estimate (in Weeks)
*  Total Task To Do (in Weeks)
*  % Completed (count)
*  % Complete (effort) - This is the % Complete in effort.  For all tasks in the Completed state, this is the sum of the Estimate.  For all tasks not in completed state, this is the sum of the (Estimate - To Do).  
*  Delta To Do (if Show Historical Data is selected).  - This is the delta in the task todo from the N days back where N is the Days Back configuration in the App Settings.  

![Screenshot](/images/manager-task-report.png)

When a user is selected in the Summary grid, one of two views will be displayed below:

#####Details Grid
This grid will show all tasks that were used in the Summary calculations.  If a manager with multiple reports was selected, then this will show all tasks that meet the selected criteria for all users that report up through that selected person, including that selected person's tasks, if he\she have any.  
Note that exports for the Details grid only include standard task fields and do not include the additional calculated or extended fields.  Exclusions include: %Completed, Work Product Dependencies, Work Product Milestones, Work Product Feature, Work Product Initiative, Historical State, Delta To Do.

![Screenshot](/images/manager-task-report-details.png)

#####Task Burndown
This chart will show the Remaining vs. Estimate for all tasks that are used in the summary calculations.  

![Screenshot](/images/manager-task-report-chart-details.png)

### App Settings 
This app relies on the existence of 3 custom User Fields:

(1) Is Manager
(2) Employee ID
(3) Manager Employee ID

These fields will need to be specified in the app settings before the app can run.  These fields are used to build the User Manager tree structure used in the summary grid and also in determining the manager-employee hierarchy so that task information can be rolled up.   

Other app settings include:
* Show Historical Data Checkbox - if selected, this app will get historical data for the tasks included in the summary.  This data is used to calculate the following:
     - Delta To Do (in the Summary Grid)
     - Delta To Do (in the details grid)
     - Historical State (in the details grid)

* Days Back 
     - For the historical data, this is the number of days back to retrieve.  So, if 7 is entered, the delta to do is the difference in To Do from exactly 7 days ago and the Historical State is the state the task was in exactly 7 days ago.  

![Screenshot](/images/manager-task-report-settings.png)



## Development Notes

### First Load

If you've just downloaded this from github and you want to do development, 
you're going to need to have these installed:

 * node.js
 * grunt-cli
 * grunt-init
 
Since you're getting this from github, we assume you have the command line
version of git also installed.  If not, go get git.

If you have those three installed, just type this in the root directory here
to get set up to develop:

  npm install

### Structure

  * src/javascript:  All the JS files saved here will be compiled into the 
  target html file
  * src/style: All of the stylesheets saved here will be compiled into the 
  target html file
  * test/fast: Fast jasmine tests go here.  There should also be a helper 
  file that is loaded first for creating mocks and doing other shortcuts
  (fastHelper.js) **Tests should be in a file named <something>-spec.js**
  * test/slow: Slow jasmine tests go here.  There should also be a helper
  file that is loaded first for creating mocks and doing other shortcuts 
  (slowHelper.js) **Tests should be in a file named <something>-spec.js**
  * templates: This is where templates that are used to create the production
  and debug html files live.  The advantage of using these templates is that
  you can configure the behavior of the html around the JS.
  * config.json: This file contains the configuration settings necessary to
  create the debug and production html files.  
  * package.json: This file lists the dependencies for grunt
  * auth.json: This file should NOT be checked in.  Create this to create a
  debug version of the app, to run the slow test specs and/or to use grunt to
  install the app in your test environment.  It should look like:
    {
        "username":"you@company.com",
        "password":"secret",
        "server": "https://rally1.rallydev.com"
    }
  
### Usage of the grunt file
####Tasks
    
##### grunt debug

Use grunt debug to create the debug html file.  You only need to run this when you have added new files to
the src directories.

##### grunt build

Use grunt build to create the production html file.  We still have to copy the html file to a panel to test.

##### grunt test-fast

Use grunt test-fast to run the Jasmine tests in the fast directory.  Typically, the tests in the fast 
directory are more pure unit tests and do not need to connect to Rally.

##### grunt test-slow

Use grunt test-slow to run the Jasmine tests in the slow directory.  Typically, the tests in the slow
directory are more like integration tests in that they require connecting to Rally and interacting with
data.

##### grunt deploy

Use grunt deploy to build the deploy file and then install it into a new page/app in Rally.  It will create the page on the Home tab and then add a custom html app to the page.  The page will be named using the "name" key in the config.json file (with an asterisk prepended).

To use this task, you must create an auth.json file that contains the following keys:
{
    "username": "fred@fred.com",
    "password": "fredfredfred",
    "server": "https://us1.rallydev.com"
}

(Use your username and password, of course.)  NOTE: not sure why yet, but this task does not work against the demo environments.  Also, .gitignore is configured so that this file does not get committed.  Do not commit this file with a password in it!

When the first install is complete, the script will add the ObjectIDs of the page and panel to the auth.json file, so that it looks like this:

{
    "username": "fred@fred.com",
    "password": "fredfredfred",
    "server": "https://us1.rallydev.com",
    "pageOid": "52339218186",
    "panelOid": 52339218188
}

On subsequent installs, the script will write to this same page/app. Remove the
pageOid and panelOid lines to install in a new place.  CAUTION:  Currently, error checking is not enabled, so it will fail silently.

##### grunt watch

Run this to watch files (js and css).  When a file is saved, the task will automatically build and deploy as shown in the deploy section above.

