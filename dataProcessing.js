var http = require('http');
var mysql = require('mysql');
var connection = mysql.createConnection({
	host: 'localhost',
	user: 'dbuser',
	password: 'dbuser',
	port: '8889',
	database: 'ResearchMap',
});
var async = require('async'); 
var cronJob = require('cron').CronJob;

// Runs every day at 3:30:00 AM.
var job = new cronJob('00 30 03 * * 1-7', function(){

  },  
  true /* Start the job right now */,
  "America: Toronto" /* Time zone of this job. */
);