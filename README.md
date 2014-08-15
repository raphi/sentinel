Load Monitoring 
===============

Load monitoring project.

Requirement
===========
npm and node: http://nodejs.org/   
Be sure to have the last npm version:    
$ sudo npm install -g npm

Install & Run ES
==========

Download ElasticSearch:   
$ curl 'https://download.elasticsearch.org/elasticsearch/elasticsearch/elasticsearch-1.3.2.tar.gz' -o elasticsearch.tar.gz && tar -xvf elasticsearch.tar.gz

Run ES server (Optional: use -d for daemon):   
$ ./elasticsearch-*/bin/elasticsearch

Create index and mapping:

$ curl -XPOST localhost:9200/datadog -d '{
"settings" : {
    "number_of_shards" : 1,
    "index": {
      "mapping.allow_type_wrapper": true
    }
},
"mappings" : {
    "server_stats": {
        "_timestamp" : { "enabled": true,  "store": true },
        "properties": {
            "load": {
                "type": "float"
            },
            "name": {
                "type": "string"
            }
        }
    }
  }
}'

Install & Run webserver
=================
$ cd server/
$ npm install
$ node app.js

Optional:
You can change default parameters in server/app.js

You can access to the page: http://127.0.0.1:8080/

Install Forwarder's script
==========================
To forward a server's load info, run forwarder.js:   
$ cd forwarder/
$ npm install
$ node forwarder.js
