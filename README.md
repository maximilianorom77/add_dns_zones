To install the project
======================

cd create_route53_zone
npm install


To execute
==========


To create a zone
****************

This will create the zone "sub.domain.com"
node node create_hosted_names --domain_name sub.domain.com


To create a zone with one name server
*************************************

This will create the zone "sub.domain.com" with the name server "ns-1617.awsdns-10.co.uk."
node node create_hosted_names --domain_name sub.domain.com --domain_name ns-1617.awsdns-10.co.uk.
