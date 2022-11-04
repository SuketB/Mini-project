#!/bin/bash
i=1
while [ $i -le 10 ]; do echo bobobobbobobobobobobobbobobobobobolog$i>> ../log_user.txt; sleep 2; i=$((i+1)); done 
sleep 10
echo bobobobbobobobobobobobbobobobobobolog$i>> ../log_user.txt
echo end >> ../log_user.txt;

