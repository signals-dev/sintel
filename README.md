[![PyPI Shield](https://img.shields.io/pypi/v/mtv.svg)](https://pypi.python.org/pypi/mtv)
[![Travis CI Shield](https://travis-ci.org/liudy1991/mtv.svg?branch=master)](https://travis-ci.org/liudy1991/mtv)

# MTV

**MTV** is a visual analytics system built for analyzing telemetry data generated by Satellites.



## License

[The MIT License](https://github.com/HDI-Project/MTV/blob/master/LICENSE)



## Before You Begin

Before you begin we recommend you read about the basic building blocks that assemble the **MTV**:

- **Python (>=3.0)** - MTV has been developed and runs on [Python 3.6](https://www.python.org/downloads/release/python-360/). Although it is not strictly required, the usage of a [virtualenv](https://virtualenv.pypa.io/en/latest/) is highly recommended in order to avoid interfering with other software installed in the system where **MTV** is run.
- **Flask (>=1.0.2)** - The best way to understand express is through its [Official Website](http://flask.pocoo.org/), which has a good [Tutorial](http://flask.pocoo.org/docs/1.0/tutorial/). We use [Flask-RESTful](https://flask-restful.readthedocs.io/en/latest/) as an extension of Flask to quickly build [REST APIs](https://www.restapitutorial.com/).
- **Typescript (>=3.0)** - Typescript's [Official Documentation](https://www.typescriptlang.org/docs/home.html) is a great starting point.
- **MongoDB (>=3.6)** - Go through [MongoDB Official Website](http://mongodb.org/) and proceed to their [Official Manual](http://docs.mongodb.org/manual/), which should help you understand NoSQL and MongoDB better.



## Prerequisites

Make sure you have installed all of the following prerequisites on your development machine:

- Git - [Download & Install Git](https://git-scm.com/downloads). OSX and Linux machines typically have this already installed.
- Node.js - [Download & Install Node.js](https://nodejs.org/en/download/) and the npm package manager. If you encounter any problems, you can also use this [GitHub Gist](https://gist.github.com/isaacs/579814) to install Node.js.
- MongoDB - [Download & Install MongoDB](http://www.mongodb.org/downloads), and make sure it's running on the default port (27017).



## Get Started

### Downloading MTV

##### Cloning from Github

The recommended way to get MTV is to use git to directly clone the MTV repository:

```bash
$ git clone https://github.com/HDI-Project/MTV mtv
```

This will clone the latest version of the MTV repository to a **mtv** folder.

##### Downloading the zip file

Another way to use the MTV is to download a zip copy from the [master branch on GitHub](https://github.com/HDI-Project/MTV/archive/master.zip). You can also do this using the `wget` command:

```bash
$ wget https://github.com/HDI-Project/MTV/archive/master.zip -O mtv.zip
$ unzip mtv.zip
$ rm meanjs.zip
```

Don't forget to rename **mtv-master** after your project name.



### Quick Install

Once you've downloaded the MTV repository and installed all the prerequisites, you're just a few steps away from running your application. To install the project, create a virtualenv and execute

```
make install
```

This command will install all the dependencies needed for the application (server-end and client-end) to run. For development, use the following command instead, which will install some additional
dependencies for code linting and testing

```
make install-develop
```



### Running Your Application

Please activate your virtualenv for MTV first, and then use the following command to run the application.

```bash
$ mtv run
```

Your application should run on **port 3000** with the ***production*** environment by default. Just go to [http://localhost:3000](http://localhost:3000) in your browser. The following list the optional arguments for `mtv run`

```
usage: mtv run [-h] [-l LOGFILE] [-v] [-P PORT] [-E ENV]

optional arguments:
  -h, --help            show this help message and exit
  -l LOGFILE, --logfile LOGFILE
                        Name of the logfile. If not given, log to stdout.
  -v, --verbose         Be verbose. Use -vv for increased verbosity.
  -P PORT, --port PORT  Flask server port
  -E ENV, --env ENV     Flask environment
```



### Development

The server-end code and client-end code are in two separate folders, namely, \<project-home>/mtv and \<project-home>/client. 

Run the following command for server-end development

```
$ mtv run -E development -v
```

Run the following command for client-end development

```
$ cd client
$ gulp
```



### Testing

to be added



## Production deploy with Docker

- Install [Docker](https://docs.docker.com/install/)

- Install [Compose](https://docs.docker.com/compose/install/)

- Production deployment with Compose

  ```
  $ curl mtv.image
  $ curl db.image
  $ docker-compose -f docker-compose-production.yml up -d
  ```

- asd



## Production deploy in local secure environment

- Install [Docker](https://docs.docker.com/install/) and [Compose](https://docs.docker.com/compose/install/)

- Download required docker images and then load them by running the following commands

  ```
  $ docker image ls
  REPOSITORY		TAG			IMAGE ID			CREATED			SIZE
  
  $ docker load --input mtv.tar
  Loaded image: dyuliu/mtv:latest
  Loaded image: mongo:4.0
  
  $ docker images
  REPOSITORY		TAG			IMAGE ID			CREATED			SIZE
  dyuliu/mtv		latest		14dfac7458de		18 hours ago	1.52GB
  mongo			4.0			30f826ce11fb        2 days ago		408MB
  ```

- Initialize mongodb folders

  ```
  $ make init-db
  mkdir -p db-instance
  mkdir -p db-instance/data
  mkdir -p db-instance/log
  mkdir -p db-instance/dump
  ```

- Download mongodb data from a safe server and unzip to the folder `db-instance/dump/`

- Restore data

  ```
  $ make restore-db
  ```

- Running up the application

  ```
  $ docker-compose up -d
  ```


