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


To create a zone
****************

This will create the zone "sub.domain.com"
node node create_hosted_names.js --domain_name sub.domain.com


To create a zone with one name server
*************************************

This will create the zone "sub.domain.com" with the name server "ns-1617.awsdns-10.co.uk."
node create_hosted_names.js --domain_name sub.domain.com --name_server ns-1617.awsdns-10.co.uk.


To upload the files to the bucket
*********************************

This will create the bucket sub.domain.com and it will upload all the files from bucket_source into the bucket
node create_bucket_website.js --bucket_name sub.domain.com --bucket_source bucket_source


TODO
====

* create and delete zones till it matches with name_server
