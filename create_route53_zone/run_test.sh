#!/bin/bash
#
# shortcut script to call the script to create the zones with the same flags
#


current_log="logs/create_zones.log"
last_log=$(ls -tr logs/create_zones.*.log | grep -E "[0-9]" | tail -1)
last_number=$(echo $last_log | grep -oE "[0-9]+")
new_number=$(bc <<< "${last_number} + 1")
move_to="logs/create_zones.${new_number}.log"
mv $current_log $move_to
date > $current_log
zone_name=testzone2.com
# it takes 17 minutes aprox to create 1000 zones
LOG_LEVEL=DEBUG time node ./create_hosted_zones.js \
         --domain_name $zone_name \
         --name_server ns-1617.awsdns-10.co.uk. \
         --bucket_url "${zone_name}.s3-website-us-east-1.amazonaws.com" \
         --limit_create 1000 \
         --max_tries 10 > $current_log 2>&1

