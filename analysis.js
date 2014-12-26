/*
script.js: exctarcts relationships between grants and publications

copyright Arman Didandeh 2014
*/
		// DEPENDENCIES
var async = require('async');
var _ = require('underscore');
var $ = require('jquery');
var natural = require('natural');
natural.PorterStemmer.attach();
var tokenizer = new natural.WordTokenizer();
var mysql = require('mysql');

function checkInvestigator(_pid, _list) {
	var _temp = new Object();
	_temp._flag = "false";
	_temp._principal = -1;

	_list.forEach(function(_item) {
		if(_item._professorID == _pid) {
			_temp._flag = true;
			_temp._principal = _item._principal;
		}
	});
	
	return _temp;
}

function filterItems(_item, _list) {
	var _flag = false;
	_list.forEach(function(name) {
		if(name == _item) {
			_flag = true;
		}
	});
	
	return _flag;
}

function isNumber(_item) {
    return ((typeof parseInt(_item)) == ("number"));
}

function sigmoid(t) {
	return 1/(1+Math.pow(Math.E, -t));
}

var counter = 1;

  //GRANT-PUBLICATION RELATIONSHIPS EXTRACTION
  //award_relationship_extractor("0000031951", [], ["Kero J.", "Blaauw R.C."], 2003, 2012, 0.15, 1, "Algorithm1");  //single investigator example
  // award_relationship_extractor("0000025975", [], ["Kero J.", "Blaauw R.C."], 2003, 2012, 0.2, 0, "Algorithm1");  //multiple investigator example

exports.calculate_analyzable_grants = function calculate_analyzable_grants(callback) {

	var analyzable_grants = new Object();
	analyzable_grants._id = "analyzable_grants";
	analyzable_grants._grantList = new Array();

	/*var connection = mysql.createConnection({
		host : '129.100.19.193',
		port : '3306', 
		user : 'arman',
		password : 'redirection',
		database  : 'researchmap_new2' 
	});
  	connection.connect();*/

  	var pool = mysql.createPool({
		//connectionLimit : 10,
		host : '129.100.19.193',
        port : '3306', 
        user : 'arman',
        password : 'redirection',
        database  : 'researchmap_new2' 
	});

	var query_text = "SELECT DISTINCT award_2.Proposal FROM (award_2 INNER JOIN award_professor_2 ON award_2.ID = award_professor_2.Grant) INNER JOIN author_2 ON award_professor_2.Professor = author_2.Professor_ID WHERE author_2.Professor_ID IS NOT NULL AND award_2.Proposal IS NOT NULL and award_2.BeginDate !='0000-00-00'";
	pool.query(query_text, function(err, result) {
        if(err) {
            //console.log(query_text);
            console.log(err);
			//connection.end();
        }
        else {
        	if(_.size(result) == 0) {
	            console.log("No award to be analyzed further!!!");
				//connection.end();
	            callback(analyzable_grants);
          	}
          	else {
            	result.forEach(function(record) {
              		analyzable_grants._grantList.push(record);
            	});
            	console.log(_.size(analyzable_grants._grantList) + " awards returned for further analysis");
				//connection.end();
            	callback(analyzable_grants);
          	}
        }
	});
}

    //@param begin_date and end_date numbers in the form of 2014
    //@param threshold value that is used as part of the analysis, between 0.01 and 0.25 is a natural choice
    //@param kernel_selection takes only values 0 or 1
    //@param algorithm_selection takes only values "Algorithm1" or "Algorithm2"
		
exports.award_relationship_extractor =  function award_relationship_extractor(proposal_ID, keyword_filter_array, name_filter_array, begin_date, end_date, threshold, kernel_selection, algorithm_selection, myfunction) {
	//GLOBAL VARIABLES
	var _stopWords=['a','able','about','above','abroad','according','accordingly','across','actually','adj','after','afterwards','again','against','ago','ahead','aint','all','allow','allows','almost','alone','along','alongside','already','also','although','always','am','amid','amidst','among','amongst','an','and','another','any','anybody','anyhow','anyone','anything','anyway','anyways','anywhere','apart','appear','appreciate','appropriate','are','arent','around','as','as','aside','ask','asking','associated','at','available','away','awfully','b','back','backward','backwards','be','became','because','become','becomes','becoming','been','before','beforehand','begin','behind','being','believe','below','beside','besides','best','better','between','beyond','both','brief','but','by','c','came','can','cannot','cant','cant','caption','cause','causes','certain','certainly','changes','clearly','cmon','co','co.','com','come','comes','concerning','consequently','consider','considering','contain','containing','contains','corresponding','could','couldnt','course','cs','currently','d','dare','darent','definitely','described','despite','did','didnt','different','directly','do','does','doesnt','doing','done','dont','down','downwards','during','e','each','edu','eg','eight','eighty','either','else','elsewhere','end','ending','enough','entirely','especially','et','etc','even','ever','evermore','every','everybody','everyone','everything','everywhere','ex','exactly','example','except','f','fairly','far','farther','few','fewer','fifth','first','five','followed','following','follows','for','forever','former','formerly','forth','forward','found','four','from','further','furthermore','g','get','gets','getting','given','gives','go','goes','going','gone','got','gotten','greetings','h','had','hadnt','half','happens','hardly','has','hasnt','have','havent','having','he','hed','hell','hello','help','hence','her','here','hereafter','hereby','herein','heres','hereupon','hers','herself','hes','hi','him','himself','his','hither','hopefully','how','howbeit','however','hundred','i','id','ie','if','ignored','ill','im','immediate','in','inasmuch','inc','inc.','indeed','indicate','indicated','indicates','inner','inside','insofar','instead','into','inward','is','isnt','it','itd','itll','its','its','itself','ive','j','just','k','keep','keeps','kept','know','known','knows','l','last','lately','later','latter','latterly','least','less','lest','let','lets','like','liked','likely','likewise','little','look','looking','looks','low','lower','ltd','m','made','mainly','make','makes','many','may','maybe','maynt','me','mean','meantime','meanwhile','merely','might','mightnt','mine','minus','miss','more','moreover','most','mostly','mr','mrs','much','must','mustnt','my','myself','n','name','namely','nd','near','nearly','necessary','need','neednt','needs','neither','never','neverf','neverless','nevertheless','new','next','nine','ninety','no','nobody','non','none','nonetheless','noone','no-one','nor','normally','not','nothing','notwithstanding','novel','now','nowhere','o','obviously','of','off','often','oh','ok','okay','old','on','once','one','ones','ones','only','onto','opposite','or','other','others','otherwise','ought','oughtnt','our','ours','ourselves','out','outside','over','overall','own','p','particular','particularly','past','per','perhaps','placed','please','plus','possible','presumably','probably','provided','provides','q','que','quite','qv','r','rather','rd','re','really','reasonably','recent','recently','regarding','regardless','regards','relatively','respectively','right','round','s','said','same','saw','say','saying','says','second','secondly','see','seeing','seem','seemed','seeming','seems','seen','self','selves','sensible','sent','serious','seriously','seven','several','shall','shant','she','shed','shell','shes','should','shouldnt','since','six','so','some','somebody','someday','somehow','someone','something','sometime','sometimes','somewhat','somewhere','soon','sorry','specified','specify','specifying','still','sub','such','sup','sure','t','take','taken','taking','tell','tends','th','than','thank','thanks','thanx','that','thatll','thats','thats','thatve','the','their','theirs','them','themselves','then','thence','there','thereafter','thereby','thered','therefore','therein','therell','therere','theres','theres','thereupon','thereve','these','they','theyd','theyll','theyre','theyve','thing','things','think','third','thirty','this','thorough','thoroughly','those','though','three','through','throughout','thru','thus','till','to','together','too','took','toward','towards','tried','tries','truly','try','trying','ts','twice','two','u','un','under','underneath','undoing','unfortunately','unless','unlike','unlikely','until','unto','up','upon','upwards','us','use','used','useful','uses','using','usually','v','value','various','versus','very','via','viz','vs','w','want','wants','was','wasnt','way','we','wed','welcome','well','well','went','were','were','werent','weve','what','whatever','whatll','whats','whatve','when','whence','whenever','where','whereafter','whereas','whereby','wherein','wheres','whereupon','wherever','whether','which','whichever','while','whilst','whither','who','whod','whoever','whole','wholl','whom','whomever','whos','whose','why','will','willing','wish','with','within','without','wonder','wont','would','wouldnt','x','y','yes','yet','you','youd','youll','your','youre','yours','yourself','yourselves','youve','z','zero'];  
	var _MIN = 2.5;
	
	/*var connection = mysql.createConnection({
        host : '129.100.19.193',
        port : '3306', 
        user : 'arman',
        password : 'redirection',
        database  : 'researchmap_new2' 
	});
	connection.connect();*/

	var pool  = mysql.createPool({
		//connectionLimit : 50,
		host		: '129.100.19.193',
        port 		: '3306', 
        user		: 'arman',
        password	: 'redirection',
        database  	: 'researchmap_new2'
        //queueLimit	: 0
	});

	var analyzed_award = new Object();
	analyzed_award._id = "analyzed_award ".concat(proposal_ID);
	analyzed_award._awardProposal = proposal_ID;
	analyzed_award._awardID = -1;
	analyzed_award._awardStatus = "";
  	analyzed_award._error = 0;
	analyzed_award._note = "";

	var professor_ID_list = new Array();
	var uniq_professor_ID_list = new Array();

	console.log();
	console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^");
	console.log("1: inside function");
	async.series([
		//test the input values
		function(callback) {
			/*console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%");
			console.log();
			console.log(threshold);
			console.log(kernel_selection);
			console.log(algorithm_selection);
			console.log();
			console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%");*/

			callback();
		},

		//create connection to mysql db
		/*function(callback) {
			connection.connect();
			
			callback();
		},*/

		//check for initial errors
		/*function(callback) {
			if(analyzed_award._error){
				//callback();
				connection.end();
				console.log("analyzed award has an error 1: " + analyzed_award._note);
				myfunction(analyzed_award);
			}
			else {
				callback();
			}
		},*/

		//check award status
		function(callback) {
			console.log("2: check award status");
			if(analyzed_award._error){
				//callback();
				//connection.end();
				console.log("analyzed award has an error 2: " + analyzed_award._note);
				myfunction(analyzed_award);
				return;
			}
			
			var query_text = "SELECT `ID`, `Proposal`, `AwardStatus` FROM `award_2` WHERE TRIM(LEADING '0' FROM Proposal) = ".concat(proposal_ID);
      		
      		//connection.query(query_text, function(err, result) {
      		pool.query(query_text, function(err, result) {
        		//console.log(query_text);
        		if(err) {
        			console.log(err);

		            analyzed_award._error = 1;
		            analyzed_award._note = err;
					//connection.end();
		            myfunction(analyzed_award);
		            return analyzed_award;
		        }
        		else {
          			var temp = new Object();

		        	if(_.size(result) == 0) {
		        		analyzed_award._awardID = -1;
			          	analyzed_award._awardProposal = proposal_ID;
			          	analyzed_award._awardStatus = "Unknown";
						analyzed_award._error = 1;
						analyzed_award._note = "Cannot not find this award proposal in the database";
						//connection.end();
						myfunction(analyzed_award);
		            	return analyzed_award;
		        	}
		        	else if(_.size(result) == 1) {
			            analyzed_award._awardID = result[0].ID;
			          	analyzed_award._awardProposal = proposal_ID;
			          	analyzed_award._awardStatus = (result[0].AwardStatus == 1) ? "Accepted" : "Declined";
		        	}
		        	else if(_.size(result) > 1) {
		        		analyzed_award._awardID = result[0].ID;
		          		analyzed_award._awardProposal = proposal_ID;
		          		analyzed_award._awardStatus = (result[0].AwardStatus == 1) ? "Accepted" : "Declined";
		          		console.log("*** Proposal #" + proposal_ID + " returns multiple rows ***");
		        	}
        		}
			 
       			callback();
      		});
		},
		
		//retrieve award information
		function(callback) {
			console.log("3: retrieve award information");
			if(analyzed_award._error){
				//callback();
				//connection.end();
				console.log("analyzed award has an error 3: " + analyzed_award._note);
				myfunction(analyzed_award);
		        return;
			}

			var query_text = "SELECT `Title`, `Keyword`, `Abstract` FROM `award_2` WHERE `ID`=".concat(analyzed_award._awardID);
				
			//connection.query(query_text, function(err, result) {
			pool.query(query_text, function(err, result) {
	            if(err) {
					console.log(err);
        			
        			analyzed_award._error = 1;
					analyzed_award._note = err;
					// connection.end();
					myfunction(analyzed_award);
					return analyzed_award;
	            }
	            else {
					analyzed_award._title = result[0].Title;
					analyzed_award._keyword = result[0].Keyword;
					analyzed_award._abstract = result[0].Abstract;
					analyzed_award._awardKeywords = new Array();
	            }

	            callback();
	        });
		},

		//create the object and retrieve the investigators
		function(callback) {
			console.log("4: create the object and retrieve the investigators");
			if(analyzed_award._error){
				//callback();
				// connection.end();
				console.log("analyzed award has an error 4: " + analyzed_award._note);
				myfunction(analyzed_award);
				return ;
			}
			
			if(analyzed_award._awardStatus) {
				analyzed_award._note = "Accepted";
				analyzed_award._investigatorsList = new Array();
				analyzed_award._relatedPublicationsList = new Array();
				analyzed_award._coAuthorsList = new Array();
				analyzed_award._inactiveCoAuthorsList = new Array();
				analyzed_award._addedKeywordsList = new Array();
				analyzed_award._inactiveKeywordsList = new Array();

				var query_text = "SELECT `Professor`, `Principal` FROM `award_professor_2` WHERE `Grant`=".concat(analyzed_award._awardID);
				
				//connection.query(query_text, function(err, result) {
				pool.query(query_text, function(err, result) {
		            if(err) {
						console.log(err);
        			
        				analyzed_award._error = 1;
						analyzed_award._note = err;
						//connection.end();
						myfunction(analyzed_award);
						return analyzed_award;
		            }
		            else {
		            	result.forEach(function(record) {
			            	var temp = new Object();
			            	temp._professorID = record.Professor;
			            	temp._principal = record.Principal;
			            	analyzed_award._investigatorsList.push(temp);
		            	});
		            }

		            callback();
		        });
			}
			else {
				analyzed_award._error = 1;
        		analyzed_award._note = "No awards were granted to this award proposal.";
				//connection.end();
        		myfunction(analyzed_award);
        		return analyzed_award;
			}
		},

		//retrieve the publications for the investigator(s)
		function(callback) {
			console.log("5: retrieve the publications for the investigator(s)");
			if(analyzed_award._error){
				//callback();
				//connection.end();
				console.log("analyzed award has an error 5: " + analyzed_award._note);
				myfunction(analyzed_award);
				return ;
			}
			
			if(analyzed_award._awardStatus) {
				if(_.size(analyzed_award._investigatorsList) < 1) {
					/*console.log("********");
					console.log(_.size(analyzed_award._investigatorsList) + " investigators were retrieved for this award proposal from the database");
					console.log("********");*/
				
					console.log("******************************************HUGE ERROR #1******************************************");
					analyzed_award._error = 1;
					analyzed_award._note = "No investigators were associated with this award proposal in the database.";
					//connection.end();
          			myfunction(analyzed_award);
          			return analyzed_award;
				}
				else if(_.size(analyzed_award._investigatorsList) == 1) {
					var investigator = analyzed_award._investigatorsList[0];

					var query_text = "SELECT DISTINCT `publication_author_2`.`Publication`, `publication_author_2`.`Author`, `author_2`.`Professor_ID`, `publication_2`.`Year`, `publication_2`.`Title`, `publication_2`.`AuthorKeywords`, `publication_2`.`IndexKeywords`"
									+" FROM (`publication_author_2` INNER JOIN `author_2` ON `publication_author_2`.`Author`=`author_2`.`ID`) INNER JOIN `publication_2` ON `publication_2`.ID=`publication_author_2`.`Publication`"
									+" WHERE `publication_2`.`Year`>=".concat(begin_date).concat(" AND `publication_2`.`Year`<=").concat(end_date).concat(" AND `author_2`.`Professor_ID` =").concat(investigator._professorID);
					
					//connection.query(query_text, function(err, result) {
					pool.query(query_text, function(err, result) {
			            if(err) {
			            	console.log(err);
        			
        					analyzed_award._error = 1;
		                    analyzed_award._note = err;
							//connection.end();
                    		myfunction(analyzed_award);
                    		return analyzed_award;
			            }
			            else {
			            	result.forEach(function(record) {
			            		var temp = new Object();
			            		temp._publicationID = record.Publication;
			            		temp._year = record.Year;
			            		temp._title = record.Title;
			            		temp._authorKeywords = record.AuthorKeywords;
			            		temp._indexKeywords = record.IndexKeywords;
			            		temp._authors = new Array();
			            		temp._radius1 = 0;
			            		temp._radius2 = 0;
			            		temp._radius = 0;
			            		temp._active = true;
			            		
			            		analyzed_award._relatedPublicationsList.push(temp);
			            	});
			            }

                  		callback();
			        });
				}
				else if(_.size(analyzed_award._investigatorsList) > 1) {
					var query_values = "";

					analyzed_award._investigatorsList.forEach(function(investigator) {
						query_values = query_values.concat(investigator._professorID).concat(" OR `author_2`.`Professor_ID`=");
					});
					query_values = query_values.substring(0, query_values.length - 30);
					
					var query_text = "SELECT DISTINCT `publication_author_2`.`Publication`, `publication_author_2`.`Author`, `author_2`.`Professor_ID`, `publication_2`.`Year`, `publication_2`.`Title`,`publication_2`.`AuthorKeywords`, `publication_2`.`IndexKeywords`"
									+" FROM (`publication_author_2` INNER JOIN `author_2` ON `publication_author_2`.`Author`=`author_2`.`ID`) INNER JOIN `publication_2` ON `publication_2`.ID=`publication_author_2`.`Publication`"
									+" WHERE `publication_2`.`Year`>=".concat(begin_date).concat(" AND `publication_2`.`Year`<=").concat(end_date).concat(" AND `author_2`.`Professor_ID` =").concat(query_values);
					
					//connection.query(query_text, function(err, result) {
					pool.query(query_text, function(err, result) {
			            if(err) {
			            	console.log(err);
        			
        					analyzed_award._error = 1;
                    		analyzed_award._note = err;
							//connection.end();
                    		myfunction(analyzed_award);
                    		return analyzed_award;
			            }
			            else {
			            	result.forEach(function(record) {
			            		var temp = new Object();
			            		temp._publicationID = record.Publication;
			            		temp._year = record.Year;
			            		temp._title = record.Title;
			            		temp._authorKeywords = record.AuthorKeywords;
			            		temp._indexKeywords = record.IndexKeywords;
			            		temp._authors = new Array();
			            		temp._radius1 = 0;
			            		temp._radius2 = 0;
			            		temp._active = true;
			            		
			            		analyzed_award._relatedPublicationsList.push(temp);
			            	});
			            }

                  		callback();
			        });
				}
			}
        	else {
      			analyzed_award._error = 1;
        		analyzed_award._note = "No awards were granted to this award proposal.";
				//connection.end();
        		myfunction(analyzed_award);
        		return analyzed_award;
        	}
    	},

    	//find professor_IDs of publications
		function(callback) {
			console.log("6: find professor_IDs of publications");
			if(analyzed_award._error){
				//callback();
				//connection.end();
				console.log("analyzed award has an error 6: " + analyzed_award._note);
				myfunction(analyzed_award);
				return ;
			}
			
			if(_.size(analyzed_award._relatedPublicationsList) > 0) {
				analyzed_award._relatedPublicationsList.forEach(function(publication) {
					var query_text = "SELECT `Author`, `Fullname`, `Professor_ID` FROM `publication_author_2` INNER JOIN `author_2` ON `publication_author_2`.`Author` = `author_2`.`ID` WHERE `Publication` ="
									.concat(publication._publicationID);

					//connection.query(query_text, function(err, result) {
					pool.query(query_text, function(err, result) {
			            if(err) {
			            	console.log(err);
        			
        					analyzed_award._error = 1;
	                  		analyzed_award._note = err;
							//connection.end();
	                  		myfunction(analyzed_award);
	                  		return analyzed_award;
			            }
			            else {
			            	if(_.size(result) > 0) {
			            		result.forEach(function(record) {
			            			var temp = new Object();
		            				temp._authorID = record.Author;
		            				temp._fullName = record.Fullname;
		            				temp._professorID = record.Professor_ID;
		            				temp._role = "non-investigator";
		            				publication._authors.push(temp);
			            		});
			            	}
			            	else {
	                    		analyzed_award._error = 1;
	                    		analyzed_award._note = "The investigators listed for this proposal have no publication record in our database.";
								//connection.end();
	                    		myfunction(analyzed_award);
	                    		return analyzed_award;
	                  		}
			            }

		                callback();
			        });
				});
			}
			else {
				analyzed_award._error = 1;
        		analyzed_award._note = "None of the publications within our current database are correlated to this award proposal";
				//connection.end();
        		myfunction(analyzed_award);
        		return analyzed_award;
			}
    	},

		//check authors for being investigators
		function(callback) {
			console.log("7: check authors for being investigators");
			if(analyzed_award._error){
				//callback();
				//connection.end();
				console.log("analyzed award has an error 7: " + analyzed_award._note);
				myfunction(analyzed_award);
				return ;
			}
			
			if(_.size(analyzed_award._relatedPublicationsList) > 0) {
				analyzed_award._relatedPublicationsList.forEach(function(publication) {
	          		publication._authors.forEach(function(author) {
	            		if(author._professorID != null) {
	              			var state = checkInvestigator(author._professorID, analyzed_award._investigatorsList);
	              			if(state._flag == true) {
	                			if(state._principal == 0) {
	                  				author._role = "co-investigator";
	                			}
	                			else if(state._principal == 1) {
	                  				author._role = "principal-investigator";
	                			}
	              			}
	            		}
	          		});
	        	});

        		callback();
      		}
			else {
        		callback();
      		}
		},

		//create full list of co-authors
		function(callback) {
			console.log("8: create full list of co-authors");
			if(analyzed_award._error){
				//callback();
				//connection.end();
				console.log("analyzed award has an error 8: " + analyzed_award._note);
				myfunction(analyzed_award);
				return ;
			}
			
			var co_author_list = new Array();

			if(_.size(analyzed_award._relatedPublicationsList) > 0) {
        		analyzed_award._relatedPublicationsList.forEach(function(publication) {
          			publication._authors.forEach(function(author) {
            			co_author_list.push(author._fullName);
          			});
        		});
        		analyzed_award._coAuthorsList = co_author_list;

        		/*console.log("number of co-authors captured: " + _.size(co_author_list._coAuthorsList));
        		console.log("number of co-authors set to object: " + _.size(analyzed_award._coAuthorsList));
        		console.log();*/

		        callback();
      		}
      		else {
        		analyzed_award._error = 1;
        		analyzed_award._note = "None of the publications within our current database are correlated to this award proposal";
				//connection.end();
        		myfunction(analyzed_award);
        		return analyzed_award;
      		}
		},

		//calculate radius1
		function(callback) {
			console.log("9: calculate radius1");
			if(analyzed_award._error){
				//callback();
				//connection.end();
				console.log("analyzed award has an error 9: " + analyzed_award._note);
				myfunction(analyzed_award);
				return ;
			}
			
			if((kernel_selection != 0) && (kernel_selection != 1)) {
				console.log("******************************************HUGE ERROR #2******************************************");
      			analyzed_award._error = 1;
      			analyzed_award._note = "Wrong entry for the aggregation!!!   " + kernel_selection;
				//connection.end();
      			myfunction(analyzed_award);
      			return analyzed_award;
			}
			else {
				if(_.size(analyzed_award._relatedPublicationsList) > 0) {
					analyzed_award._relatedPublicationsList.forEach(function(publication) {
						var flag = false;
						var count = 0;

						publication._authors.forEach(function(author) {
							if(author._role == "principal-investigator") {
								flag = true;
							}
							if(author._role == "co-investigator") {
								count++;
							}
						});

						if(kernel_selection == 0) {
							if(flag) {
								publication._radius1 = 50;
							}
							else {
								publication._radius1 = _MIN;
							}
						}
						else if(kernel_selection == 1) {
							if(flag) {
								publication._radius1 = ((count+2)/(_.size(publication._authors)+1))*50;
							}
							else {
								publication._radius1 = ((count)/(_.size(publication._authors)+1))*50;
							}
						}
					});
				}
				else {
					analyzed_award._error = 1;
	        		analyzed_award._note = "None of the publications within our current database are correlated to this award proposal";
					//connection.end();
	        		myfunction(analyzed_award);
	        		return analyzed_award;
				}
			}

      		callback();
    	},

		//filter co-authors and corresponding publications
		function(callback) {
			console.log("10: filter co-authors and corresponding publications");
			if(analyzed_award._error){
				//callback();
				//connection.end();
				console.log("analyzed award has an error 10: " + analyzed_award._note);
				myfunction(analyzed_award);
				return;
			}
			
			var filtered_publications = new Array();

			if(_.size(name_filter_array) > 0) {
				var flag = false;
				analyzed_award._relatedPublicationsList.forEach(function(publication) {
					name_filter_array.forEach(function(name) {
						publication._authors.forEach(function(author) {
							if(name == author._fullName) {
								flag = true;
								analyzed_award._inactiveCoAuthorsList.push(name);
							}
						});
						
						publication._active = !flag;
					});
				});

        		callback();
			}
      		else {
        		callback();
      		}
		},

		//extract keywords for award
		function(callback) {
			console.log("11: extract keywords for award");
			if(analyzed_award._error){
				//callback();
				//connection.end();
				console.log("analyzed award has an error 11: " + analyzed_award._note);
				myfunction(analyzed_award);
				return;
			}
			
			//tokenize, stem and remove stop words
			var _titleTokenized = tokenizer.tokenize(analyzed_award._title);
			var _keywordTokenized = tokenizer.tokenize(analyzed_award._keyword);
			var _extractedKeywords = _.uniq(_titleTokenized.concat(_keywordTokenized));
			var _extractedKeywordsStopWordsRemoved = _.reject(_extractedKeywords, function(word) {
				return filterItems(word.toLowerCase(), _stopWords)
			});
			analyzed_award._awardKeywords = _extractedKeywordsStopWordsRemoved;
				
			callback();
		},

		//extract keywords for publications
		function(callback) {
			console.log("12: extract keywords for publications");
			if(analyzed_award._error){
				//callback();
				//connection.end();
				console.log("analyzed award has an error 12: " + analyzed_award._note);
				myfunction(analyzed_award);
				return;
			}
			
			analyzed_award._relatedPublicationsList.forEach(function(publication) {
			//tokenize, stem and remove stop words
        	var _titleTokenized = tokenizer.tokenize(publication._title);
        	var _authorKeywordTokenized = tokenizer.tokenize(publication._authorKeywords);
        	var _indexKeywordTokenized = tokenizer.tokenize(publication._indexKeywords);
        	var _extractedKeywords = _.uniq(_titleTokenized.concat(_authorKeywordTokenized.concat(_indexKeywordTokenized)));
        	var _extractedKeywordsStopWordsRemoved = _.reject(_extractedKeywords, function(word) { return (filterItems(word.toLowerCase(), _stopWords)) });
	     		publication._keywords = _extractedKeywordsStopWordsRemoved;
			});

			analyzed_award._relatedPublicationsList.forEach(function(publication) {
				publication._keywords.forEach(function(keyword) {
					var temp = new Object();
					temp.word = keyword.toLowerCase();
					temp.frequency = 0
					analyzed_award._addedKeywordsList.push(temp);
				});
			});

			analyzed_award._relatedPublicationsList.forEach(function(publication) {
				publication._keywords.forEach(function(keyword) {
					analyzed_award._addedKeywordsList.forEach(function(keyword_tuple) {
						if(keyword_tuple.word == keyword) {
							keyword_tuple.frequency++;
						}
					});
				});
			});
			
			analyzed_award._addedKeywordsList.sort(function(a,b) {return a.frequency - b.frequency;});
      		
      		callback();
		},

		//unify addedKeywordsList and add up the frequencies
		function(callback) {
			console.log("13: unify addedKeywordsList and add up the frequencies");
			if(analyzed_award._error){
				//callback();
				//connection.end();
				console.log("analyzed award has an error 13: " + analyzed_award._note);
				myfunction(analyzed_award);
				return;
			}
			
			var uniqAddedKeywordsList = new Array();
			var uniqkeywords = _.uniq(_.pluck(analyzed_award._addedKeywordsList, 'word'));

			uniqkeywords.forEach(function(word) {
				var temp = new Object();
        		temp.word = word;
        		temp.frequency = 0;
        		uniqAddedKeywordsList.push(temp);
      		});

	    	uniqAddedKeywordsList.forEach(function(uniq_keyword) {
				analyzed_award._addedKeywordsList.forEach(function(keyword_tuple) {
          			if(uniq_keyword.word == keyword_tuple.word) {
            			uniq_keyword.frequency += keyword_tuple.frequency;
          			}
        		});
      		});
	
			analyzed_award._addedKeywordsList = uniqAddedKeywordsList;

			analyzed_award._addedKeywordsList.sort(function(a,b) {return a.frequency - b.frequency;});

		    callback();
    	},

    	//filter keywords that are numbers
    	function(callback) {
    		console.log("14: filter keywords that are numbers");
    		var temp = _.filter(analyzed_award._addedKeywordsList, function(keyword_item) {return isNumber(keyword_item.word)});
			analyzed_award._addedKeywordsList = temp;

			callback();
    	},

		//calculate radius2
		function(callback) {
			console.log("15: calculate radius2");
			if(analyzed_award._error){
				//callback();
				//connection.end();
				console.log("analyzed award has an error 14: " + analyzed_award._note);
				myfunction(analyzed_award);
				return;
			}
			
			analyzed_award._relatedPublicationsList.forEach(function(publication) {
				var match_count = 0;
				publication._keywords.forEach(function(publication_keyword) {
					analyzed_award._awardKeywords.forEach(function(award_keyword) {
						if((publication_keyword.toLowerCase() == award_keyword.toLowerCase()) ||
							(natural.PorterStemmer.stem(publication_keyword.toLowerCase()) == natural.PorterStemmer.stem(award_keyword.toLowerCase()))) {
							match_count++;
						}
					});
				});

				//if not keyword match
				if(match_count == 0) {
					publication._radius2 = _MIN;
					// console.log("no match_count");
				}
				else {
					var weight = ((match_count) / (Math.min(_.size(publication._keywords), _.size(analyzed_award._awardKeywords))));
						//// ***SIMPLE THRESHOLDING***
					/*if(weight >= threshold) {
						publication._radius2 = weight * 50;
					}
					else {
						publication._radius2 = 0;
					}*/

						//// ***SIGMOID THRESHOLDING***
					var temp = 50 * (sigmoid(weight - (4*threshold)));
					publication._radius2 = (temp > _MIN) ? temp : _MIN;
					/*console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%");
					console.log("algorithm_selection: " + algorithm_selection);
					console.log("kernel_selection: " + kernel_selection);
					console.log("weight: " + weight);
					console.log("threshold: " + 4*threshold);
					console.log("temp: " + temp);
					console.log("publication._radius1: " + publication._radius1);
					console.log("publication._radius2: " + publication._radius2);
					console.log("--------------------------");
					console.log();
					console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%");*/
 				
				}
			});

			callback();
		},

		//calculate radius
		function(callback) {
			console.log("16: calculate radius");
			if(analyzed_award._error){
				//callback();
				//connection.end();
				console.log("analyzed award has an error 15: " + analyzed_award._note);
				myfunction(analyzed_award);
				return;
			}
			if((algorithm_selection != "Algorithm1") && algorithm_selection != "Algorithm2") {
				console.log("******************************************HUGE ERROR #3******************************************");
	          			analyzed_award._error = 1;
	          			analyzed_award._note = "Wrong entry for the algorithm!!!   " + algorithm_selection;
						//connection.end();
	          			myfunction(analyzed_award);
	          			return analyzed_award;
			}
			else {
				if(_.size(analyzed_award._relatedPublicationsList) > 0) {

					analyzed_award._relatedPublicationsList.forEach(function(publication) {
						if(algorithm_selection == "Algorithm1") {
							publication._radius = (publication._radius1 + publication._radius2) / 2;
						}
						else if(algorithm_selection == "Algorithm2") {
							var author_count = _.size(publication._authors);
							var keywords_count = _.size(publication._keywords);

							var weight1 = author_count / (author_count + keywords_count);
							var weight2 = keywords_count / (author_count + keywords_count);
							
							publication._radius = (weight1 * publication._radius1) + (weight2 * publication._radius2);
						}
					});
				}
				else {
					analyzed_award._error = 1;
	        		analyzed_award._note = "None of the publications within our current database are correlated to this award proposal";
					//connection.end();
	        		myfunction(analyzed_award);
	        		return analyzed_award;
				}
			}

      		callback();
		},

		//filter keywords
		function(callback) {
			console.log("17: filter keywords");
			if(analyzed_award._error){
				//callback();
				//connection.end();
				console.log("analyzed award has an error 16: " + analyzed_award._note);
				myfunction(analyzed_award);
				callback();
			}
			
			if((_.size(keyword_filter_array) > 0) && _.size(analyzed_award._relatedPublicationsList) > 0) {
				var flag = false;
				analyzed_award._relatedPublicationsList.forEach(function(publication) {
					keyword_filter_array.forEach(function(word) {
						publication._keywords.forEach(function(keyword) {
							if(word == keyword) {
								flag = true;
								analyzed_award._inactiveKeywordsList.push(word);
							}
						});
						
						publication._active = !flag;
					});
				});

        		callback();
			}
      		else {
        		callback();
      		}
		},

		//filter based on recieved keywords and co-authors
		//	(.) the publications that hav _.active == false should be removed
		//	(.) hence, this function filters and returns only those that are set to be active
		function(callback) {
			console.log("18: filter based on recieved keywords and co-authors");
			if(analyzed_award._error){
				//callback();
				//connection.end();
				console.log("analyzed award has an error 17: " + analyzed_award._note);
				myfunction(analyzed_award);
				callback();
			}
			
			/*analyzed_award._relatedPublicationsList.forEach(function(publication, i) {
				if(!publication._active) {
					analyzed_award._relatedPublicationsList.splice(i, 1);
				}
			});*/
			var temp = _.filter(analyzed_award._relatedPublicationsList, function(publication) {return publication._active});
			analyzed_award._relatedPublicationsList = temp;

			callback();
		}
	],
	function(err, results) {
		//console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^");
		if(analyzed_award._error){
			//console.log(analyzed_award._error);
			return;
		}
		
		//connection.end();

	    if(err) {
	    	console.log(err);
			analyzed_award._error = 1;
	    	analyzed_award._note = "Async error";
			myfunction(analyzed_award);
			return analyzed_award;
		}
		else {
			//console.log("this called " + (counter++) + " times");
			//console.log(_.size(analyzed_award._relatedPublicationsList));
			myfunction(analyzed_award);
			return analyzed_award;
		}
	});
}
