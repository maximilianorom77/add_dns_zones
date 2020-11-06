To install the project
======================

cd create_route53_zone
npm install


Configuration
=============

You must create a file in ~/.aws/credentials

The File has the following content, replace the aws_access_key_id and the aws_secret_access_key with your credentials

[default]
aws_access_key_id = ASIA27TUBHUZ7XPKEKGJ
aws_secret_access_key = dga+/kMxZxt2AqzugtSuddSeNI0yxJak21ill2Yy


Execution
=========


To create a Route 53 zone with one name server
**********************************************

This will create the zone "sub.domain.com" with the name server "ns-1617.awsdns-10.co.uk."

the max_tries flag tells the script the maximum count of zones to create simultaneusly if it reaches this point
it will stop creating and it will wait for the deletetion to happen and when the number is lower it will
start again creating.

the limit_create flag limits the amount of zones to create when reached this number the script will stop after deleting
all the zones that it created while trying to match the name server.

node create_hosted_zones.js --domain_name sub.domain.com --name_server ns-1617.awsdns-10.co.uk. --max_tries 10 --limit_create 1000


To create a S3 bucket for web hosting and upload files to it
************************************************************

This will create the bucket sub.domain.com and it will upload all the files from bucket_source into the bucket
node create_bucket_website.js --bucket_name sub.domain.com --bucket_source bucket_source


Logging
=======

All the scripts can be run with the LOG_LEVEL variable in front when LOG_LEVEL=DEBUG the script
will be more verbose and it will print all the logs including the logs from AWS SDK, for example run:

LOG_LEVEL=DEBUG node create_bucket_website.js --bucket_name sub.domain.com --bucket_source bucket_source


Q&A
===


how many zones can we create per minute?
****************************************

Testing I run the script to create 1000 zones maximum, It took 17 minutes to complete so the script can create 1000 / 17 = 58.82 zones per minute aprox, on this 17 minutes of testing the script couldn't find a zone that matches with the name server ns-1617.awsdns-10.co.uk. that I specified.

But in another test out of luck it matched the name server in less than 3 minutes, so almost imposible to predict how much time it will take to match the name server.


TODO
====


* Add a flag to specify the type "A" record in the zone to point to the bucket


Bugs
====


* It tries to match the value of the ns against the value of the ns with the trailing period DONE

* Never finishes because it cannot delete a zone that it can't find DONE

ne found with ID: Z02914962GYH6HQZWHUIH
Error deleting zone: Z02914962GYH6HQZWHUIH
max_tries reached skipping zone_create
Deleting zone: Z02914962GYH6HQZWHUIH
No hosted zone found with ID: Z02914962GYH6HQZWHUIH


script improvement and future work
==================================


* allow multiple name_server inputs or a file with name servers on each line.~


Qute To Analyze
===============


so weird though, I found the 3 i was looking for

only 1 seemed to save to my account

I wonder if I killed the job before all the adding deleting was done

it said matched but only first is showing in my account
