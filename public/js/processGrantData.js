

function processGrantData (error, data) {
	console.log("hello!");

	grantData = data;  

	//loop through each entry (row) in the dataset
	for (entry in grantData) {
		var proposalID = parseFloat(grantData[entry].Proposal);

		grantDepartments.push(grantData[entry].Department);
		proposalStatuses.push(grantData[entry].ProposalStatus);
		awardStatuses.push(grantData[entry].AwardStatus);
		grantSponsors.push(grantData[entry].Sponsor);

		//if proposalID already exists in grants
		if (typeof grants[proposalID] == "object"){
			var tempcounter = 0.01;
			//while the appended proposal exists, add another number to the key
			while (typeof grants[parseFloat(proposalID) + tempcounter] == "object")
				tempcounter += 0.01;

			proposalID = proposalID + tempcounter;
		}

		//prepare the new entry
		grants[proposalID] = {};

		//populate the new entry with the data
		grants[proposalID]["PI"] = grantData[entry].PI;
		grants[proposalID]["CoI"] = grantData[entry].CoI;
		grants[proposalID]["Role"] = grantData[entry].Role;
		grants[proposalID]["DeptID"] = grantData[entry].DeptID;
		grants[proposalID]["Department"] = grantData[entry].Department;
		grants[proposalID]["Proposal"] = grantData[entry].Proposal;
		grants[proposalID]["AwardID"] = grantData[entry].AwardID;
		grants[proposalID]["Title"] = grantData[entry].Title;
		grants[proposalID]["Created"] = grantData[entry].Created;
		grants[proposalID]["Deadline"] = grantData[entry].Deadline;
		grants[proposalID]["Type"] = grantData[entry].Type;
		grants[proposalID]["ProposalStatus"] = grantData[entry].ProposalStatus;
		grants[proposalID]["AwardStatus"] = grantData[entry].AwardStatus;
		grants[proposalID]["BeginDate"] = grantData[entry].BeginDate;
		grants[proposalID]["EndDate"] = grantData[entry].EndDate;
		grants[proposalID]["IndirectCosts"] = grantData[entry].IndirectCosts;
		grants[proposalID]["IndirectCostPercent"] = grantData[entry].IndirectCostPercent;
		grants[proposalID]["MatchingFunds"] = grantData[entry].MatchingFunds;
		grants[proposalID]["PartnerContrib"] = grantData[entry].PartnerContrib;
		grants[proposalID]["RequestAmt"] = grantData[entry].RequestAmt;
		grants[proposalID]["Sponsor"] = grantData[entry].Sponsor;
		grants[proposalID]["PgmName"] = grantData[entry].PgmName;
		grants[proposalID]["CompName"] = grantData[entry].CompName;
		grants[proposalID]["Keyword"] = grantData[entry].Keyword;

	}

	//remove duplicates
	grantDepartments = _.uniq(grantDepartments);
	proposalStatuses = _.uniq(proposalStatuses);	
	awardStatuses = _.uniq(awardStatuses);
	grantSponsors = _.uniq(grantSponsors);


	$.each(grants, function(k,v){
		if (k % 1 == 0){
			grantsUnique.push(v);
		}
	});

	prepareSankey(grants);
	prepareSankeyDepts(grants);
	prepareTreemap(grantsUnique);

}//end processGrantData

function prepareSankey (grants) {

	//populate the "nodes" with the data (here it is hardcoded. it is assumed future data will have the same fields)
	sankeyData["nodes"].push({"name":"Proposal"});
	sankeyData["nodes"].push({"name":"Accepted"});
	sankeyData["nodes"].push({"name":"Declined"});
	sankeyData["nodes"].push({"name":"Inst. Approval"});
	sankeyData["nodes"].push({"name":"Pending Approval"});
	sankeyData["nodes"].push({"name":"Draft"});
	sankeyData["nodes"].push({"name":"Withdrawn"});
	sankeyData["nodes"].push({"name":"Award Pending"});
	sankeyData["nodes"].push({"name":"Accepted"});
	sankeyData["nodes"].push({"name":"Closed"});

	//these are the counts, which end up dictating the width of the links
	var targetAccepted = 0;
	var targetDeclined = 0;
	var targetIApproved = 0;
	var targetPA = 0;
	var targetDraft = 0;
	var targetWithdrawn = 0;
	var targetAP = 0;
	var targetAcc = 0;
	var targetClosed = 0;

	//loop through each entry
	//the function receives the key and the value 
	$.each(grants, function(k, v){
		//don't want to count duplicates (e.g., keys 681, 681.01, etc...)
		//e.g., 681.01 will not be true in the conditional below
		if (k % 1 == 0){

			switch(this.Department) {

			}

			var accepted = false; //for the second switch statement
			switch(this.ProposalStatus) {
				case "Accepted":
					accepted = true;
					targetAccepted += 1;
					break;
				case "Declined":
					targetDeclined += 1;
					break;				
				case "Inst. Approved":
					targetIApproved += 1;
					break;
				case "Pending Approval":
					targetPA += 1;
					break;				
				case "Draft":
					targetDraft += 1;
					break;
				case "Withdrawn":
					targetWithdrawn += 1;
					break;
				default: //for debugging...should throw an error if executed
					target = 100000;
					break;
			}					


			//if the proposal was accepted, add another link that shows what happened from there
			if (accepted){
				switch(this.AwardStatus) {
					case "Award Pending":
						targetAP += 1; //update target to reflect the new target
						break;
					case "Accepted":
						targetAcc += 1;
						break;
					case "Closed":
						targetClosed += 1;
						break;
					default: //for debugging...should throw an error if executed
						target = 100001;
						break;
				}
			}
		}
	});

	//for proposal status
	//source just indicates the existence of the proposal (all proposals exist)
	//target indicates the proposal status
	//value is what has been calculated in the switch statement above
	sankeyData["links"].push({ "source":0, "target":1, "value":targetAccepted });
	sankeyData["links"].push({ "source":0, "target":2, "value":targetDeclined });
	sankeyData["links"].push({ "source":0, "target":3, "value":targetIApproved });
	sankeyData["links"].push({ "source":0, "target":4, "value":targetPA });
	sankeyData["links"].push({ "source":0, "target":5, "value":targetDraft });
	sankeyData["links"].push({ "source":0, "target":6, "value":targetWithdrawn });

	//for those that got accepted
	//source is accepted (1)
	//target indicates award status 
	sankeyData["links"].push({ "source":1, "target":7, "value":targetAP });
	sankeyData["links"].push({ "source":1, "target":8, "value":targetAcc });
	sankeyData["links"].push({ "source":1, "target":9, "value":targetClosed });

	//the next 5 are simply placeholders
	//their value is set in such a way that the links won't show up
	sankeyData["links"].push({ "source":2, "target":8, "value":0.1 });
	sankeyData["links"].push({ "source":3, "target":8, "value":0.1 });
	sankeyData["links"].push({ "source":4, "target":8, "value":0.1 });
	sankeyData["links"].push({ "source":5, "target":8, "value":0.1 });
	sankeyData["links"].push({ "source":6, "target":8, "value":0.1 });


	//constructSankey(sankeyData);
} //end prepareSankey

//prepares the data for the sankey according to department
function prepareSankeyDepts (grants) {

	//populate the 'nodes' array with the departments
	grantDepartments.forEach (function(element) {
		sankeyDataDepartments["nodes"].push({"name":element});
	});

	//add to the "nodes" with the data (here it is hardcoded. it is assumed future data will have the same fields)
	sankeyDataDepartments["nodes"].push({"name":"Proposal"});
	sankeyDataDepartments["nodes"].push({"name":"Accepted"});
	sankeyDataDepartments["nodes"].push({"name":"Declined"});
	sankeyDataDepartments["nodes"].push({"name":"Inst. Approved"});
	sankeyDataDepartments["nodes"].push({"name":"Pending Approval"});
	sankeyDataDepartments["nodes"].push({"name":"Draft"});
	sankeyDataDepartments["nodes"].push({"name":"Withdrawn"});
	sankeyDataDepartments["nodes"].push({"name":"Award Pending"});
	sankeyDataDepartments["nodes"].push({"name":"Accepted"});
	sankeyDataDepartments["nodes"].push({"name":"Closed"});	

	//populate the object that will keep track of all of the target to source possibilities
	//e.g., computer science-->accepted, computer science-->declined, chemistry-->accepted, etc. 
	grantDepartments.forEach (function (element) {
		departmentProposals[element + "_Accepted"] = 0;
		departmentProposals[element + "_Declined"] = 0;
		departmentProposals[element + "_Inst. Approved"] = 0;
		departmentProposals[element + "_Pending Approval"] = 0;
		departmentProposals[element + "_Draft"] = 0;
		departmentProposals[element + "_Withdrawn"] = 0;
	});

	//loop through each grant entry
	//function parameters are key (k) and value (v)
	$.each(grants, function(k, v){
	 	//don't want to count duplicates (e.g., keys 681, 681.01, etc...)
	 	//e.g., 681.01 will not be true in the conditional below
		if (k % 1 == 0){
			switch (this.ProposalStatus) {
				case "Accepted":
					departmentProposals[this.Department + "_Accepted"] += 1;
					break;
				case "Declined":
					departmentProposals[this.Department + "_Declined"] += 1;
					break;				
				case "Inst. Approved":
					departmentProposals[this.Department + "_Inst. Approved"] += 1;
					break;
				case "Pending Approval":
					departmentProposals[this.Department + "_Pending Approval"] += 1;
					break;				
				case "Draft":
					departmentProposals[this.Department + "_Draft"] += 1;
					break;
				case "Withdrawn":
					departmentProposals[this.Department + "_Withdrawn"] += 1;
					break;
				default: //for debugging...should throw an error if executed
					target = 100000;
					break;				
			}//end switch
		}//end if
	});

	$.each(departmentProposals, function (k, v) {
		//get the department name
		var tempDep= k.substr(0, k.indexOf('_'));
		var tempStatus= k.substr(k.indexOf('_') + 1);		

		//get the number that corresponds to the department name
		var source = getCorrNum(tempDep, sankeyDataDepartments.nodes);
		//get the number that corresponds to the proposal status
		var target = getCorrNum(tempStatus, sankeyDataDepartments.nodes);

		sankeyDataDepartments["links"].push({ "source":source, "target":target, "value":v });
	});
				


	// 		//if the proposal was accepted, add another link that shows what happened from there
	// 		if (accepted){
	// 			switch(this.AwardStatus) {
	// 				case "Award Pending":
	// 					targetAP += 1; //update target to reflect the new target
	// 					break;
	// 				case "Accepted":
	// 					targetAcc += 1;
	// 					break;
	// 				case "Closed":
	// 					targetClosed += 1;
	// 					break;
	// 				default: //for debugging...should throw an error if executed
	// 					target = 100001;
	// 					break;
	// 			}
	// 		}
	// 	}
	// });

	// //for proposal status
	// //source just indicates the existence of the proposal (all proposals exist)
	// //target indicates the proposal status
	// //value is what has been calculated in the switch statement above
	// sankeyData["links"].push({ "source":0, "target":1, "value":targetAccepted });
	// sankeyData["links"].push({ "source":0, "target":2, "value":targetDeclined });
	// sankeyData["links"].push({ "source":0, "target":3, "value":targetIApproved });
	// sankeyData["links"].push({ "source":0, "target":4, "value":targetPA });
	// sankeyData["links"].push({ "source":0, "target":5, "value":targetDraft });
	// sankeyData["links"].push({ "source":0, "target":6, "value":targetWithdrawn });

	// //for those that got accepted
	// //source is accepted (1)
	// //target indicates award status 
	// sankeyData["links"].push({ "source":1, "target":7, "value":targetAP });
	// sankeyData["links"].push({ "source":1, "target":8, "value":targetAcc });
	// sankeyData["links"].push({ "source":1, "target":9, "value":targetClosed });

	// //the next 5 are simply placeholders
	// //their value is set in such a way that the links won't show up
	// sankeyData["links"].push({ "source":2, "target":8, "value":0.1 });
	// sankeyData["links"].push({ "source":3, "target":8, "value":0.1 });
	// sankeyData["links"].push({ "source":4, "target":8, "value":0.1 });
	// sankeyData["links"].push({ "source":5, "target":8, "value":0.1 });
	// sankeyData["links"].push({ "source":6, "target":8, "value":0.1 });

	//constructSankey(sankeyDataDepartments);
	populateFilter(grantDepartments, grantYears, proposalStatuses, awardStatuses);
} //end prepareSankeyDepts

function prepareTreemap (grantData) {

	nested_by_sponsor = d3.nest()
    .key(function(d) { return d.Sponsor; })
    .key(function(d) { return d.PgmName; })
    .entries(grantData);

	nested_by_department = d3.nest()
    .key(function(d) { 
    	return d.Department; })	
    //.key(function(d) { return d.Sponsor; })
    //.key(function(d) { return d.PgmName; })
    .entries(grantData);

    //reformat the data so it is in the format that d3's algorithms are expecting
    reformat(nested_by_sponsor); 
    reformat(nested_by_department);

    //add the roots to these
    nested_by_department = {name:"Departments", children:nested_by_department}; 
    nested_by_sponsor = {name:"Sponsors", children:nested_by_sponsor}; 

    //call the function that will construct the treemap (it is located in the html file)
	//constructTreemap(nested_by_department);   

	top20 = topSponsors(20);


	  //close the colorbox
  //a new one is loaded after this (see grants)
  $.colorbox.close(); 



}//end prepareTreemap

//takes a string name and returns the corresponding number
//name: string
//sourceList: array
function getCorrNum (name, sourceList) {
	var temp;
	sourceList.forEach (function (element, index) {
		if (name == element.name){
			temp = index;
		}
	});
	return temp;

}//end getCorrNum

//recursively takes an array that has been created with d3.nest and reformats the array
//so that the 'key' is changed to 'name' and 'values' is changed to 'children'
//this is necessary for d3's layouts, which internally require those names
//@param: data: an array of nested objects that was created using d3.nest(). e.g., nested_by_sponsor
//$return: nothing
function reformat(data){
	//this is true for the root
	if (_.isArray(data)) {
	    for(var i = 0; i < data.length; i++){
		    while (data[i].values[0].values != undefined) { //i.e., there are "children"
		    	reformat(data[i].values);
			}
		
		data[i].children = data[i]['values'];
		data[i].name = data[i]['key'];
	    delete data[i].key;
		delete data[i].values;
		}  
	}
}


function topSponsors (topNum) {
	var temp = _.extend({}, grantSponsors);
	temp = _.invert(temp);

	//for each pair in temp
	$.each(grants, function(k, v){
		//loop through the grantData
		for (entry in grantData){
			//get top 'num' according to requestamt
		  var req = this.RequestAmt;
	      req = req.replace(/^\s+|\s+$/g, ''); //remove whitespaces
	      req = req.replace(/\$/g,""); //remove dollar sign
	      req = req.replace(/,/g,""); //remove commas
	      req = parseFloat(req); //convert from string to float	
			//if bigger than current, replace
			if (temp[this.Sponsor] < req)
				temp[this.Sponsor] = req;
		}

	});
	var temp2 = [];
	$.each(temp, function(k,v){
		temp2.push([k,v]);
	});
	temp2.sort(function(a, b) {return a[1] - b[1]});

	var sliced = temp2.slice(temp2.length-topNum);
	var finallist = [];

	sliced.forEach(function(element){
		finallist.push(element[0]);
	});

	return finallist;
}

//takes a string name and returns the corresponding number
//name: string
//sourceList: array
function getTargetNum (name) {
	var temp;
	switch(name) {
		case "Accepted":
			temp = 1;
			break;
		case "Declined":
			temp = 2;
			break;				
		case "Inst. Approved":
			temp = 3;
			break;
		case "Pending Approval":
			temp = 4;
			break;				
		case "Draft":
			temp = 5;
			break;
		case "Withdrawn":
			temp = 6;
			break;
		default: //for debugging...should throw an error if executed
			temp = 100000;
			break;
	}		
	return temp;
}//end getTargetNum