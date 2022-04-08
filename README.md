<!-- markdownlint-disable MD033 -->

# DIEM

[![GitHub issues](https://img.shields.io/github/issues/IBM/diem)](https://github.com/IBM/diem/issues)
[![GitHub forks](https://img.shields.io/github/forks/IBM/diem)](https://github.com/IBM/diem/network)
[![GitHub stars](https://img.shields.io/github/stars/IBM/diem)](https://github.com/IBM/diem/stargazers)
[![GitHub license](https://img.shields.io/github/license/IBM/diem)](https://github.com/IBM/diem/blob/main/LICENSE)
[![Build Status](https://img.shields.io/endpoint.svg?url=https%3A%2F%2Factions-badge.atrox.dev%2FIBM%2Fdiem%2Fbadge%3Fref%3Dmain&style=flat)](https://actions-badge.atrox.dev/IBM/diem/goto?ref=main)
<img alt="Helm" src="https://img.shields.io/badge/dynamic/yaml?label=helm&query=version&prefix=v&url=https://raw.githubusercontent.com/IBM/diem/main/charts/diem/Chart.yaml"/>
<br/><br/>
<img alt="NodeJS" src="https://img.shields.io/badge/node.js%20-%2343853D.svg?&style=for-the-badge&logo=node.js&logoColor=white"/>
<img alt="Angular" src="https://img.shields.io/badge/angular%20-%23DD0031.svg?&style=for-the-badge&logo=angular&logoColor=white"/>
<img alt="Python" src="https://img.shields.io/badge/python%20-%2314354C.svg?&style=for-the-badge&logo=python&logoColor=white"/>
<img alt="TypeScript" src="https://img.shields.io/badge/typescript%20-%23007ACC.svg?&style=for-the-badge&logo=typescript&logoColor=white"/>
<img alt="Webpack" src="https://img.shields.io/badge/webpack%20-%238DD6F9.svg?&style=for-the-badge&logo=webpack&logoColor=black" />
<img alt="Docker" src="https://img.shields.io/badge/docker%20-%230db7ed.svg?&style=for-the-badge&logo=docker&logoColor=white"/>
<img alt="Kubernetes" src="https://img.shields.io/badge/kubernetes%20-%23326ce5.svg?&style=for-the-badge&logo=kubernetes&logoColor=white"/>
<img alt="GitHub Actions" src="https://img.shields.io/badge/github%20actions%20-%232671E5.svg?&style=for-the-badge&logo=github%20actions&logoColor=white"/>
<a href="https://bestpractices.coreinfrastructure.org/projects/5900"><img src="https://bestpractices.coreinfrastructure.org/projects/5900/badge"></a>

> Python, Spark, REST, Scala, Pipelines, Scheduling, API, Custom Jobs, SQL Statements, Openshift, Cloud Native, Machine Learning, Sendgrid, Kubernetes, Slack, Cloud Object Storage, JDBC, Box

Diem can be used to create, display, execute and maintain data transfers between hardware and database platforms. It will cover how to create and manage transfers and assign them to a schedule to execute regularly without human intervention.

Diem provides a front end for SPARK ETL (Extract, Transform, Load) – an SQL data pipeline that can be used to synchronize data between RDMS platforms. Composed of individual transfer operations called jobs, the tool will execute SQL statements to select data from a source system and insert or replicate the data on a target system.

Diem allows the user to create scripts using the interpreted programming language Python, and to create sophisticated schedules using Cron (a work scheduler for Unix systems.) The combination of Python and Cron, along with the intrinsic ability to define and execute custom SQL statements, allows a range of activities from simple data transfers to more sophisticated job streams.

Diem also allows quick and easy definition of connections, as well as a scheduler and log display. An interface to Slack can be used to send the results of jobs to a specified Slack channel.

# Application Features

| Feature              | Feature Summary                             | Benefits                                                                                                                                                                                                                        |
| -------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Spaces**           | Support for Multiple Organisations          | Multiple Organisations can make use of DIEM, each org can have it's own space. You can even have multiple spaces per Org and use it for test, pre-prod or production                                                            |
| **Data Transfer**    | NodyPy                                      | Fast transfer of small data sets <100 k using pandas jdbc sqlalchemy                                                                                                                                                            |
| **Data Transfer**    | Spark                                       | Bulk Transfer of big data using spark, both pyspark an scala.<br/> Partition your data for paralel inserts.<br/>Write you sql online and easy manage your job.<br/>Include it in a pipeline.<br/>Get notified via slack or mail |
| **Custom Code**      | Write your own python code                  | Write your own python code using pyspark or python. Integrate your favorite library, use your jdbc connection, integrate your config maps, code snippets, webhooks all in one pl;ace, creating a unique experience              |
| **API Services**     | Rest services for external use              | Create jobs that can provide REST Services. Connect external applications to your code and provide rest services for them                                                                                                       |
| **Machine Learning** | Embed Machine Learning in your code         | Make use of the latest ML Libraries like SciPy, matplotlib, seaborn, pandas etc.. to create machine learning models that can be used in your code                                                                               |
| **Connections**      | DB2<br/>Netezza<br/>ProgreSQL<br/>Many more | JDBC connectins into various sources, easy to add and manage.<br/>Secrets kept secure if personal                                                                                                                               |
| **Webhooks**         | Bring in your own webhook                   | Webooks can be to integrate into your applications. You can bring in your git or slack webhook and use it n your applications                                                                                                   |
| **Slack**            | Slack Integration                           | Either you use the default slack channels or bring in your own slack api key. All job progress are logged to your slack channels. You can even integrate them in your custom jobs. Provide custom content and subject messages  |
| **Pipelines**        | Pipelins of Jobs                            | Group your jobs together and form a pipleline. Start each job at the same time or in order. Manage dependences and organize them in steps                                                                                       |
| **Scheduling**       | Cron Schedule                               | Schedule to run jor jobs using an advance Cron schedule that can handle any type of timeframe and schedule                                                                                                                      |
| **Mail**             | Mail Functionality                          | Send mail on Completion or Failure of jour job to your audiance                                                                                                                                                                 |
| **Mail Integration** | Mail Functionality for your code            | Integrate mail functionality in your code, send data reports as html, csv , xls to your audience based on your query. Customize headers and body content.                                                                       |
| **Files**            | Upload, Download or integrate files         | Each space is connected to it's own Cloud Object Storage Buckewt and can be integrated in your code. You can also specify any other COS instance                                                                                |
| **Box**              | Upload, Download from BOX                   | You can now directly download and upload files from Box                                                                                                                                                                         |
| **Config Maps**      | Manage parameters and config values         | Config maps are vary usefull as you can spererate your code from it's values. They can be kept private and secure so you can use them for storing your own tokens.                                                              |
| **Tags**             | Define your own tags                        | You can set up your own tags for easy job search, classification and job management                                                                                                                                             |
| **Templates**        | Reusable or shared Templates                | Your code could be based of a template, that you can clone from , you can lso have shared code which is the same amongst your jobs but only different in configuration                                                          |
| **Code Snipptes**    | Reusabel adn sharable code                  | Create reusable code, share use it in your jobs.<br/>This allows you to reuse your code in multiple jobs, maintaining key code centrally                                                                                        |
| **Job Log**          | Audit trails of completed job               | Each started job will have it's own audit trail, so you can go back to view errors and integrate it in your reporting for performance review                                                                                    |
| **Organization**     | Organization Profile                        | View your Profile and your access rights organisation                                                                                                                                                                           |
| **Organizations**    | Organizations you belong to                 | See all organisations you belong to                                                                                                                                                                                             |
| **Space Selector**   | Easy move between spaces                    | You can at any time easily swtich between organisations your belong to                                                                                                                                                          |
