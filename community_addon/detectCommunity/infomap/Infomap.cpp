/* ------------------------------------------------------------------------

 Infomap software package for multi-level network clustering

 * Copyright (c) 2013
 * For license and authors, see README.txt or http://www.mapequation.org

------------------------------------------------------------------------ */

#include <iostream>
#include <sstream>
#include <fstream>
#include <stdexcept>
#include "utils/Logger.h"
#include "io/Config.h"
#include "infomap/InfomapContext.h"
#include "utils/Stopwatch.h"
#include "io/ProgramInterface.h"
#include "io/convert.h"
#include "utils/FileURI.h"
#include "utils/Date.h"
#include <iomanip>
#include "io/version.h"

void runInfomap(Config const& config)
{
	InfomapContext context(config);
	context.getInfomap()->run();
}

Config getConfig(int argc, char *argv[])
{
	Config conf;
	ProgramInterface api("Infomap",
			"Implementation of the Infomap clustering algorithm based on the Map Equation (see www.mapequation.org)",
			INFOMAP_VERSION);

	// --------------------- Input options ---------------------
	api.addNonOptionArgument(conf.networkFile, "network_file",
			"The file containing the network data. Accepted formats: Pajek (implied by .net) and link list (.txt)");

	api.addOptionArgument(conf.inputFormat, 'i', "input-format",
			"Specify input format ('pajek' or 'link-list') to override format possibly implied by file extension.", "s");

	api.addOptionArgument(conf.zeroBasedNodeNumbers, 'z', "zero-based-numbering",
			"Assume node numbers start from zero in the input file instead of one.");

	api.addOptionArgument(conf.includeSelfLinks, 'k', "include-self-links",
			"Include links with the same source and target node. (Ignored by default.)");

	api.addOptionArgument(conf.nodeLimit, 'S', "node-limit",
			"Limit the number of nodes to read from the network. Ignore links connected to ignored nodes.", "n");

	api.addOptionArgument(conf.clusterDataFile, 'c', "cluster-data",
			"Provide an initial two-level solution (.clu format).", "p");

	// --------------------- Output options ---------------------
//	api.addOptionArgument(conf.printNodeRanks, 'p', "print-node-ranks",
//			"Print the calculated flow for each node to a file.");
//
	api.addOptionArgument(conf.printFlowNetwork, 'W', "print-flow-network",
			"Print the network with calculated flow values.");
//	TODO: Add map container so that printing can be added like -Pranks -Pflow etc!!

	api.addOptionArgument(conf.noFileOutput, '0', "no-file-output",
			"Don't print any output to file.");

	// --------------------- Core algorithm options ---------------------
	api.addOptionArgument(conf.twoLevel, '2', "two-level",
			"Optimize a two-level partition of the network.");

	bool dummyUndirected;
	api.addOptionArgument(dummyUndirected, 'u', "undirected",
			"Assume undirected links (default)");

	api.addOptionArgument(conf.directed, 'd', "directed",
			"Assume directed links");

	api.addOptionArgument(conf.undirdir, 't', "undirdir",
			"Two-mode dynamics: Assume undirected links for calculating flow, but directed when minimizing codelength.");

	api.addOptionArgument(conf.rawdir, 'w', "rawdir",
			"Two-mode dynamics: Assume directed links and let the raw link weights be the flow.");

	api.addOptionArgument(conf.unrecordedTeleportation, 'e', "unrecorded-teleportation",
			"Assume teleportation when calculating flow (on directed network) but don't encode that flow.");

	api.addOptionArgument(conf.teleportToNodes, 'o', "to-nodes",
			"Teleport to nodes (like the PageRank algorithm) instead of to links.");

	api.addOptionArgument(conf.teleportationProbability, 'p', "teleportation-probability",
			"The probability of teleporting to a random node or link.", "f");

	api.addOptionArgument(conf.selfTeleportationProbability, 'y', "self-link-teleportation-probability",
			"The probability of teleporting to itself.", "f");

	api.addOptionArgument(conf.seedToRandomNumberGenerator, 's', "seed",
			"A seed (integer) to the random number generator.", "n");

	// --------------------- Performance and accuracy options ---------------------
	api.addOptionArgument(conf.numTrials, 'N', "num-trials",
			"The number of outer-most loops to run before picking the best solution.", "n");

	api.addOptionArgument(conf.minimumCodelengthImprovement, 'm', "min-improvement",
			"Minimum codelength threshold for accepting a new solution.", "f");

	api.addOptionArgument(conf.randomizeCoreLoopLimit, 'a', "random-loop-limit",
			"Randomize the core loop limit from 1 to 'core-loop-limit'");

	api.addOptionArgument(conf.coreLoopLimit, 'M', "core-loop-limit",
			"Limit the number of loops that tries to move each node into the best possible module", "n");

	api.addOptionArgument(conf.levelAggregationLimit, 'L', "core-level-limit",
			"Limit the number of times the core loops are reapplied on existing modular network to search bigger structures.", "n");

	api.addOptionArgument(conf.tuneIterationLimit, 'T', "tune-iteration-limit",
			"Limit the number of main iterations in the two-level partition algorithm. 0 means no limit.", "n");

	api.addOptionArgument(conf.minimumRelativeTuneIterationImprovement, 'U', "tune-iteration-threshold",
			"Set a codelength improvement threshold of each new tune iteration to 'f' times the initial two-level codelength.", "f");

	api.addOptionArgument(conf.fastCoarseTunePartition, 'C', "fast-coarse-tune",
			"Try to find the quickest partition of each module when creating sub-modules for the coarse-tune part.");

	api.addOptionArgument(conf.alternateCoarseTuneLevel, 'A', "alternate-course-tune-level",
			"Try to find different levels of sub-modules to move in the coarse-tune part.");

	api.addOptionArgument(conf.coarseTuneLevel, 'S', "course-tune-level",
			"Set the recursion limit when searching for sub-modules. A level of 1 will find sub-sub-modules.", "n");

	api.addIncrementalOptionArgument(conf.fastHierarchicalSolution, 'F', "fast-hierarchical-solution",
			"Find top modules fast. Use -FF to keep all fast levels. Use -FFF to skip recursive part.");

	api.addOptionArgument(conf.coarseTuneLevel, 'S', "course-tune-level",
			"Set the recursion limit when searching for sub-modules. A level of 1 will find sub-sub-modules.", "n");

	// --------------------- Output options ---------------------
	api.addNonOptionArgument(conf.outDirectory, "out_directory",
			"The directory to write the results to");

	api.addIncrementalOptionArgument(conf.verbosity, 'v', "verbose",
			"Verbose output on the console. Add additional 'v' flags to increase verbosity up to -vvv.");

	api.parseArgs(argc, argv);

	// Some checks
	if (*--conf.outDirectory.end() != '/')
		conf.outDirectory.append("/");

	return conf;
}

void initBenchmark(const Config& conf, int argc, char * const argv[])
{
	std::string networkName = FileURI(conf.networkFile).getName();
	std::string logFilename = io::Str() << conf.outDirectory << networkName << ".tsv";
	Logger::setBenchmarkFilename(logFilename);
	std::ostringstream logInfo;
	logInfo << "#benchmark for";
	for (int i = 0; i < argc; ++i)
		logInfo << " " << argv[i];
	Logger::benchmark(logInfo.str(), 0, 0, 0, 0, true);
	Logger::benchmark("elapsedSeconds\ttag\tcodelength\tnumTopModules\tnumNonTrivialTopModules\ttreeDepth",
			0, 0, 0, 0, true);
	// (todo: fix problem with initializing same static file from different functions to simplify above)
	std::cout << "(Writing benchmark log to '" << logFilename << "'...)\n";
}

int InfomapMain(int argc, char *argv[])
{
	Date startDate;
	Config conf;
	try
	{
		conf = getConfig(argc, argv);
		if (conf.benchmark)
			initBenchmark(conf, argc, argv);
		if (conf.verbosity == 0)
			conf.verboseNumberPrecision = 4;
		std::cout << std::setprecision(conf.verboseNumberPrecision);
	}
	catch (std::exception& e)
	{
		std::cerr << e.what() << std::endl;
		return 1;
	}

	std::cout << "===========================================\n";
	std::cout << "  Infomap starts at " << Date() << "\n";
	std::cout << "===========================================\n";

	runInfomap(conf);

	ASSERT(NodeBase::nodeCount() == 0); //TODO: Not working with OpenMP
//	if (NodeBase::nodeCount() != 0)
//		std::cout << "Warning: " << NodeBase::nodeCount() << " nodes not deleted!\n";


	std::cout << "===========================================\n";
	std::cout << "  Infomap ends at " << Date() << "\n";
	std::cout << "  (Elapsed time: " << (Date() - startDate) << ")\n";
	std::cout << "===========================================\n";

//	ElapsedTime t1 = (Date() - startDate);
//	std::cout << "Elapsed time: " << t1 << " (" <<
//			Stopwatch::getElapsedTimeSinceProgramStartInSec() << "s serial)." << std::endl;
	return 0;
}
