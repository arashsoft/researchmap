/* ------------------------------------------------------------------------

 Infomap software package for multi-level network clustering

 * Copyright (c) 2013
 * For license and authors, see README.txt or http://www.mapequation.org

------------------------------------------------------------------------ */

#ifndef INFOMAPGREEDY_H_
#define INFOMAPGREEDY_H_
#include "InfomapBase.h"
#include "Node.h"
#include "NodeFactory.h"
#include "flowData_traits.h"
#include "../utils/Logger.h"
#include "../utils/infomath.h"
#include <map>
#include <utility>
#include "../io/TreeDataWriter.h"
#include "../utils/FileURI.h"
#include "../io/SafeFile.h"
#include <sstream>
#include <iomanip>
#include "../io/convert.h"

template<typename InfomapImplementation>
class InfomapGreedy : public InfomapBase
{
public:
	typedef typename flowData_traits<InfomapImplementation>::flow_type		FlowType;
	typedef Node<FlowType>													NodeType;
	typedef Edge<NodeBase>													EdgeType;

	InfomapGreedy(const Config& conf)
	:	InfomapBase(conf, new NodeFactoryTyped<FlowType>())
	{
		FlowType& rootData = getNode(*root()).data;
		rootData.flow = 1.0;
		rootData.exitFlow = 0.0;
	}
	virtual ~InfomapGreedy() {}

protected:
	// --- Overridden ---
	virtual std::auto_ptr<InfomapBase> getNewInfomapInstance();

	virtual void setNodeFlow(const std::vector<double>& nodeFlow);

	virtual void initEnterExitFlow();

	virtual void initConstantInfomapTerms();

	virtual void initModuleOptimization();

	virtual void moveNodesToPredefinedModules();

	virtual unsigned int optimizeModules();

	virtual unsigned int consolidateModules(bool replaceExistingStructure, bool asSubModules);

	// DEBUG!!
	virtual void testConsolidation();

	virtual void resetModuleFlowFromLeafNodes();

	virtual void resetModuleFlow(NodeBase& node);

	virtual double calcCodelengthFromFlowWithinOrExit(const NodeBase& parent);

	virtual double calcCodelengthFromEnterWithinOrExit(const NodeBase& parent);

	virtual void generateNetworkFromChildren(NodeBase& parent);

	virtual void transformNodeFlowToEnterFlow(NodeBase* parent);

	virtual void cloneFlowData(const NodeBase& source, NodeBase& target);

	virtual void printNodeRanks(std::ostream& out);

	virtual void printFlowNetwork(std::ostream& out);

	virtual void printMap(std::ostream& out);

	virtual void sortTree(NodeBase& parent);

	virtual void printSubInfomapTree(std::ostream& out, const TreeData& originalData, const std::string& prefix);
	void printSubTree(std::ostream& out, NodeBase& module, const TreeData& originalData, const std::string& prefix);
	virtual void printSubInfomapTreeDebug(std::ostream& out, const TreeData& originalData, const std::string& prefix);
	void printSubTreeDebug(std::ostream& out, NodeBase& module, const TreeData& originalData, const std::string& prefix);

	// --- Overridable ---
	virtual void calculateCodelengthFromActiveNetwork();

	virtual void recalculateCodelengthFromActiveNetwork();

	virtual void recalculateCodelengthFromConsolidatedNetwork();

	// --- Helper methods ---
	double getDeltaCodelength(NodeType& current, double additionalExitOldModuleIfMoved,
			unsigned int newModule, double reductionInExitFlowNewModule);

	NodeType& getNode(NodeBase& node);

	const NodeType& getNode(const NodeBase& node) const;

	unsigned int numActiveModules();
	virtual unsigned int numDynamicModules();

	// DEBUG!!
	virtual void printCodelengthTerms();
	virtual void printNodeData(NodeBase& node, std::ostream& out);
	virtual FlowDummy getNodeData(NodeBase& node);
	virtual void getTopModuleRanks(std::vector<double>& ranks);

private:
	InfomapImplementation& getImpl();

protected:
	std::vector<FlowType> m_moduleFlowData;
	std::vector<unsigned int> m_moduleMembers;
	std::vector<unsigned int> m_emptyModules;

	double nodeFlow_log_nodeFlow; // constant while the leaf network is the same
	double flow_log_flow; // node.(flow + exitFlow)
//	double exit_log_exit;
//	double enterFlow;
//	double enterFlow_log_enterFlow;
	// For hierarchical

	//TODO: Take back from InfomapBase after debugging!!!
//	double exitNetworkFlow;
//	double exitNetworkFlow_log_exitNetworkFlow;

};


template<typename InfomapImplementation>
std::auto_ptr<InfomapBase> InfomapGreedy<InfomapImplementation>::getNewInfomapInstance()
{
	return std::auto_ptr<InfomapBase>(new InfomapImplementation(m_config));
}

template<typename InfomapImplementation>
inline
void InfomapGreedy<InfomapImplementation>::setNodeFlow(const std::vector<double>& nodeFlow)
{
	unsigned int i = 0;
	for (TreeData::leafIterator it(m_treeData.begin_leaf()), itEnd(m_treeData.end_leaf());
			it != itEnd; ++it, ++i)
	{
		getNode(**it).data.flow = nodeFlow[i];
	}
}

template<typename InfomapImplementation>
inline
void InfomapGreedy<InfomapImplementation>::initEnterExitFlow()
{
	for (TreeData::leafIterator it(m_treeData.begin_leaf()), itEnd(m_treeData.end_leaf());
			it != itEnd; ++it)
	{
		NodeBase& node = **it;
		for (NodeBase::edge_iterator edgeIt(node.begin_outEdge()), edgeEnd(node.end_outEdge());
				edgeIt != edgeEnd; ++edgeIt)
		{
			EdgeType& edge = **edgeIt;
			// Possible self-links should not add to enter and exit flow in its enclosing module
			if (edge.source != edge.target)
			{
				getNode(edge.source).data.exitFlow += edge.data.flow;
				getNode(edge.target).data.enterFlow += edge.data.flow;
			}
		}
	}

}

//template<>
//inline
//void InfomapGreedy<InfomapUndirected>::initEnterExitFlow()
//{
//	for (TreeData::leafIterator it(m_treeData.begin_leaf()), itEnd(m_treeData.end_leaf());
//			it != itEnd; ++it)
//	{
//		NodeBase& node = **it;
//		for (NodeBase::edge_iterator edgeIt(node.begin_outEdge()), edgeEnd(node.end_outEdge());
//				edgeIt != edgeEnd; ++edgeIt)
//		{
//			EdgeType& edge = **edgeIt;
//			getNode(edge.source).data.exitFlow += edge.data.flow;
////			getNode(edge.source).data.enterFlow += edge.data.flow;
//			getNode(edge.target).data.exitFlow += edge.data.flow;
////			getNode(edge.target).data.enterFlow += edge.data.flow;
//		}
//	}
//}
//
template<>
inline
void InfomapGreedy<InfomapDirected>::initEnterExitFlow()
{
	double sumDanglingFlow = 0.0;
	for (TreeData::leafIterator it(m_treeData.begin_leaf()), itEnd(m_treeData.end_leaf());
			it != itEnd; ++it)
	{
		NodeBase& node = **it;
		FlowType& data = getNode(node).data;
		// Also store the flow to use for teleportation as the flow can be transformed
		data.teleportSourceFlow = data.flow;
		if (node.isDangling())
		{
			sumDanglingFlow += data.flow;
			data.danglingFlow = data.flow;
		}
		else
		{
			for (NodeBase::edge_iterator edgeIt(node.begin_outEdge()), edgeEnd(node.end_outEdge());
					edgeIt != edgeEnd; ++edgeIt)
			{
				EdgeType& edge = **edgeIt;
				// Possible self-links should not add to enter and exit flow in its enclosing module
				if (edge.source != edge.target)
				{
					getNode(edge.source).data.exitFlow += edge.data.flow;
	//				getNode(edge.target).data.enterFlow += edge.data.flow;
				}
			}
		}
	}
	double alpha = m_config.teleportationProbability;
	double beta = 1.0 - alpha;
	for (TreeData::leafIterator it(m_treeData.begin_leaf()), itEnd(m_treeData.end_leaf());
			it != itEnd; ++it)
	{
		NodeType& node = getNode(**it);
		// Don't let self-teleportation add to the enter/exit flow
		node.data.exitFlow += (alpha * node.data.flow + beta * node.data.danglingFlow) * (1.0 - node.data.teleportWeight);
//		node.data.enterFlow += (alpha * (1.0 - node.data.flow) + beta * (sumDanglingFlow - node.data.danglingFlow)) * node.data.teleportWeight;

		//Note: Self-teleportation should be coded at leaf-level, but setting it like this:
//		node.data.exitFlow += (alpha * node.data.flow + beta * node.data.danglingFlow);
//		node.data.enterFlow += (alpha + beta * (sumDanglingFlow - node.data.danglingFlow)) * node.data.teleportWeight;
		// doesn't aggregate correctly when putting the node in a single module, because
		// self-teleportation goes outside the node but not outside its module.
		// Thus, the enter/exit flow on the node should be seen as the enter/exit flow a module
		// would have if it contained just that node. Instead add the special case when calculating
		// the codelength on a module if the children are leaf nodes, i.e. use the flow values
		// instead of the enter values on leaf nodes.
	}
}

//template<>
//inline
//void InfomapGreedy<InfomapDirected>::initEnterExitFlow()
//{
//	for (TreeData::leafIterator it(m_treeData.begin_leaf()), itEnd(m_treeData.end_leaf());
//			it != itEnd; ++it)
//	{
//		NodeBase& node = **it;
//		FlowType& data = getNode(node).data;
//		// Also store the flow to use for teleportation as the flow can be transformed
//		data.teleportSourceFlow = data.flow;
//		data.exitFlow = data.flow;
//		if (node.isDangling())
//			data.danglingFlow = data.flow;
//	}
//}

template<typename InfomapImplementation>
void InfomapGreedy<InfomapImplementation>::initConstantInfomapTerms()
{
	nodeFlow_log_nodeFlow = 0.0;
	// For each module
	for (activeNetwork_iterator it(m_activeNetwork.begin()), itEnd(m_activeNetwork.end());
			it != itEnd; ++it)
	{
		NodeType& node = getNode(**it);
		nodeFlow_log_nodeFlow += infomath::plogp(node.data.flow);
	}
}

template<typename InfomapImplementation>
void InfomapGreedy<InfomapImplementation>::initModuleOptimization()
{
	unsigned int numNodes = m_activeNetwork.size();
	m_moduleFlowData.resize(numNodes);
	m_moduleMembers.assign(numNodes, 1);
	m_emptyModules.clear();
	m_emptyModules.reserve(numNodes);

	unsigned int i = 0;
	for (activeNetwork_iterator it(m_activeNetwork.begin()), itEnd(m_activeNetwork.end());
			it != itEnd; ++it, ++i)
	{
		NodeType& node = getNode(**it);
		node.index = i; // Unique module index for each node
		m_moduleFlowData[i] = node.data;
	}

	// Initiate codelength terms for the initial state of one module per node
	calculateCodelengthFromActiveNetwork();

//	m_numNonTrivialTopModules = numNodes;
}

template<typename InfomapImplementation>
void InfomapGreedy<InfomapImplementation>::moveNodesToPredefinedModules()
{
	// Size of active network and cluster array should match.
	ASSERT(m_moveTo.size() == m_activeNetwork.size());
	getImpl().moveNodesToPredefinedModulesImpl();
}

template<typename InfomapImplementation>
inline
unsigned int InfomapGreedy<InfomapImplementation>::optimizeModules()
{
	unsigned int numOptimizationRounds = 0;
	double oldCodelength = codelength;
	unsigned int loopLimit = m_config.randomizeCoreLoopLimit ?
			static_cast<unsigned int>(m_rand() * m_config.coreLoopLimit) + 1 :
			m_config.coreLoopLimit;

	// Iterate while the optimization loop moves some nodes within the dynamic modular structure
	do
	{
		oldCodelength = codelength;
		getImpl().optimizeModulesImpl(); // returns numNodesMoved
		++numOptimizationRounds;
	} while (numOptimizationRounds != loopLimit &&
			codelength < oldCodelength - m_config.minimumCodelengthImprovement);

	return numOptimizationRounds;
}

template<typename InfomapImplementation>
unsigned int InfomapGreedy<InfomapImplementation>::consolidateModules(bool replaceExistingStructure, bool asSubModules)
{
	unsigned int numNodes = m_activeNetwork.size();
	std::vector<NodeBase*> modules(numNodes, 0);

	bool activeNetworkAlreadyHaveModuleLevel = m_activeNetwork[0]->parent != root();
	bool activeNetworkIsLeafNetwork = m_activeNetwork[0]->isLeaf();


	if (asSubModules)
	{
		ASSERT(activeNetworkAlreadyHaveModuleLevel);
		// Release the pointers from modules to leaf nodes so that the new submodules will be inserted as its only children.
		for (NodeBase::sibling_iterator moduleIt(root()->begin_child()), moduleEnd(root()->end_child());
				moduleIt != moduleEnd; ++moduleIt)
		{
			moduleIt->releaseChildren();
		}
	}
	else
	{
		// Happens after optimizing fine-tune and when moving leaf nodes to super clusters
		if (activeNetworkAlreadyHaveModuleLevel)
		{
			DEBUG_OUT("Replace existing " << numTopModules() << " modules with its children before consolidating the " <<
					numActiveModules() << " dynamic modules... ");
			root()->replaceChildrenWithGrandChildren();
			ASSERT(m_activeNetwork[0]->parent == root());
		}
		root()->releaseChildren();
	}

	// Create the new module nodes and re-parent the active network from its common parent to the new module level
	for (unsigned int i = 0; i < numNodes; ++i)
	{
		NodeBase* node = m_activeNetwork[i];
		unsigned int moduleIndex = node->index;
//		if (m_subLevel == 0 && m_debug)
//		{
//			RELEASE_OUT("(" << node << "->" << moduleIndex << "), ");
//		}
		if (modules[moduleIndex] == 0)
		{
			modules[moduleIndex] = new NodeType(m_moduleFlowData[moduleIndex]);
			node->parent->addChild(modules[moduleIndex]);
			modules[moduleIndex]->index = moduleIndex;
			// If node->parent is a module, its former children (leafnodes) has been released above, getting only submodules
//			if (node->parent->firstChild == node)
//				node->parent->firstChild = modules[moduleIndex];
		}
		modules[moduleIndex]->addChild(node);
	}

	if (asSubModules)
	{
		DEBUG_OUT("Consolidated " << numActiveModules() << " submodules under " << numTopModules() << " modules, " <<
				"store module structure before releasing it..." << std::endl);
		// Store the module structure on the submodules
		unsigned int moduleIndex = 0;
		for (NodeBase::sibling_iterator moduleIt(root()->begin_child()), endIt(root()->end_child());
				moduleIt != endIt; ++moduleIt, ++moduleIndex)
		{
			for (NodeBase::sibling_iterator subModuleIt(moduleIt->begin_child()), endIt(moduleIt->end_child());
					subModuleIt != endIt; ++subModuleIt)
			{
				subModuleIt->index = moduleIndex;
			}
		}
		if (replaceExistingStructure)
		{
			// Remove the module level
			root()->replaceChildrenWithGrandChildren();
		}
	}


	// Aggregate links from lower level to the new modular level
	typedef std::pair<NodeBase*, NodeBase*> NodePair;
	typedef std::map<NodePair, double> EdgeMap;
	EdgeMap moduleLinks;

	for (activeNetwork_iterator nodeIt(m_activeNetwork.begin()), nodeEnd(m_activeNetwork.end());
			nodeIt != nodeEnd; ++nodeIt)
	{
		NodeBase* node = *nodeIt;

		NodeBase* parent = node->parent;
		for (NodeBase::edge_iterator edgeIt(node->begin_outEdge()), edgeEnd(node->end_outEdge());
				edgeIt != edgeEnd; ++edgeIt)
		{
			EdgeType* edge = *edgeIt;
			NodeBase* otherParent = edge->target.parent;

			if (otherParent != parent)
			{
				// Insert the node pair in the edge map. If not inserted, add the flow value to existing node pair.
				std::pair<EdgeMap::iterator, bool> ret = \
						moduleLinks.insert(std::make_pair(NodePair(parent, otherParent), edge->data.flow));
				if (!ret.second)
					ret.first->second += edge->data.flow;
			}
		}
	}

	// Add the aggregated edge flow structure to the new modules
	for (EdgeMap::const_iterator edgeIt(moduleLinks.begin()), edgeEnd(moduleLinks.end());
			edgeIt != edgeEnd; ++edgeIt)
	{
		const NodePair& nodePair = edgeIt->first;
		nodePair.first->addOutEdge(*nodePair.second, 0.0, edgeIt->second);
	}

	// Replace active network with its children if not at leaf level.
	if (!activeNetworkIsLeafNetwork && replaceExistingStructure)
	{
		for (activeNetwork_iterator nodeIt(m_activeNetwork.begin()), nodeEnd(m_activeNetwork.end());
				nodeIt != nodeEnd; ++nodeIt)
		{
			(*nodeIt)->replaceWithChildren();
		}
	}

	// Calculate the number of non-trivial modules
	m_numNonTrivialTopModules = 0;
	for (NodeBase::sibling_iterator moduleIt(root()->begin_child()), endIt(root()->end_child());
			moduleIt != endIt; ++moduleIt)
	{
		if (moduleIt->childDegree() != 1)
			++m_numNonTrivialTopModules;
	}

	return numActiveModules();
}


template<typename InfomapImplementation>
void InfomapGreedy<InfomapImplementation>::testConsolidation()
{
	double sumEnter = 0.0;
	double sumEnterAll = 0.0;
	double sumFlow = 0.0;
	double sumFlowAll = 0.0;
	unsigned int numModules = 0;
	for (unsigned int i = 0; i < m_activeNetwork.size(); ++i)
	{
		sumEnterAll += m_moduleFlowData[i].enterFlow;
		sumFlowAll += m_moduleFlowData[i].flow;
		if (m_moduleMembers[i] != 0)
		{
			++numModules;
			sumEnter += m_moduleFlowData[i].enterFlow;
			sumFlow += m_moduleFlowData[i].flow;
		}
	}
	RELEASE_OUT("  sumFlow: " << sumFlow << ", all: " << sumFlowAll << "\n" <<
			"  sumEnter: " << sumEnter << ", all: " << sumEnterAll << "\n" <<
			"  numModules: " << numModules << "\n" <<
			"  childDegree: " << root()->childDegree() << "\n" <<
			"  numNonTrivialModules: " << m_numNonTrivialTopModules << "\n");
}


template<typename InfomapImplementation>
inline
void InfomapGreedy<InfomapImplementation>::printNodeRanks(std::ostream& out)
{
	out << "#node-flow\n";
	for (TreeData::leafIterator it(m_treeData.begin_leaf()), itEnd(m_treeData.end_leaf());
			it != itEnd; ++it)
	{
		out << getNode(**it).data.flow << '\n';
	}
}

template<typename InfomapImplementation>
inline
void InfomapGreedy<InfomapImplementation>::printFlowNetwork(std::ostream& out)
{
	for (TreeData::leafIterator nodeIt(m_treeData.begin_leaf());
			nodeIt != m_treeData.end_leaf(); ++nodeIt)
	{
		NodeBase& node = **nodeIt;
		out << node.originalIndex << " (" << getNode(node).data << ")\n";
		for (NodeBase::edge_iterator edgeIt(node.begin_outEdge()), endEdgeIt(node.end_outEdge());
				edgeIt != endEdgeIt; ++edgeIt)
		{
			EdgeType& edge = **edgeIt;
			out << "  --> " << edge.target.originalIndex << " (" << edge.data.flow << ")\n";
		}
		for (NodeBase::edge_iterator edgeIt(node.begin_inEdge()), endEdgeIt(node.end_inEdge());
				edgeIt != endEdgeIt; ++edgeIt)
		{
			EdgeType& edge = **edgeIt;
			out << "  <-- " << edge.source.originalIndex << " (" << edge.data.flow << ")\n";
		}
	}
}

template<typename InfomapImplementation>
inline
void InfomapGreedy<InfomapImplementation>::printMap(std::ostream& out)
{
	typedef std::multimap<double, EdgeType*, std::greater<double> > LinkMap;
	typedef std::multimap<double, NodeBase*, std::greater<double> > NodeMap;
	typedef std::vector<std::pair<NodeBase*, NodeMap> > ModuleData;
	// First collect and sort leaf nodes and module links
	LinkMap moduleLinks;
	ModuleData moduleData(root()->childDegree());
	unsigned int moduleIndex = 0;
	for (NodeBase::sibling_iterator moduleIt(root()->begin_child()), endIt(root()->end_child());
			moduleIt != endIt; ++moduleIt, ++moduleIndex)
	{
		moduleData[moduleIndex].first = moduleIt.base();
		// Collect leaf nodes
		LeafNodeIterator<NodeBase*> li(moduleIt.base());
		LeafNodeIterator<NodeBase*> liEnd(moduleIt->next);
		while (li != liEnd)
		{
			moduleData[moduleIndex].second.insert(std::pair<double, NodeBase*>(getNode(*li).data.flow, li.base()));
			++li;
		}

		// Collect module links
		for (NodeBase::edge_iterator outEdgeIt(moduleIt->begin_outEdge()), endIt(moduleIt->end_outEdge());
				outEdgeIt != endIt; ++outEdgeIt)
		{
			moduleLinks.insert(std::pair<double, EdgeType*>((*outEdgeIt)->data.flow, *outEdgeIt));
		}
	}

	out << "# modules: " << numTopModules() << "\n";
	out << "# modulelinks: " << moduleLinks.size() << "\n";
	out << "# nodes: " << numLeafNodes() << "\n";
	out << "# links: " << m_treeData.numLeafEdges() << "\n";
	out << "# codelength: " << hierarchicalCodelength << "\n";
	out << "*" << (m_config.isUndirected() ? "Undirected" : "Directed") << "\n";

	out << "*Modules " << numTopModules() << "\n";
	unsigned int moduleNumber = 1;
	for (ModuleData::iterator moduleIt(moduleData.begin()), endIt(moduleData.end());
			moduleIt != endIt; ++moduleIt, ++moduleNumber)
	{
		// Use the name of the biggest leaf node in the module to name the module
		NodeBase& module = *moduleIt->first;
		FlowType flowData = getNode(module).data;
		out << (module.index + 1) << " \"" << moduleIt->second.begin()->second->name << ",...\" " <<
				flowData.flow << " " << flowData.exitFlow << "\n";
	}

	// Collect the leaf nodes under each top module, sort them on flow, and write grouped on top module
	out << "*Nodes " << numLeafNodes() << "\n";
	moduleNumber = 1;
	for (ModuleData::iterator moduleIt(moduleData.begin()), endIt(moduleData.end());
			moduleIt != endIt; ++moduleIt, ++moduleNumber)
	{
		// Use the name of the biggest leaf node in the module to name the module
		NodeMap& nodeMap = moduleIt->second;
		unsigned int nodeNumber = 1;
		for (NodeMap::iterator it(nodeMap.begin()), itEnd(nodeMap.end());
				it != itEnd; ++it, ++nodeNumber)
		{
			out << moduleNumber << ":" << nodeNumber << " \"" << it->second->name << "\" " <<
				it->first << "\n";
		}
	}

	out << "*Links " << moduleLinks.size() << "\n";
	for (LinkMap::iterator linkIt(moduleLinks.begin()), endIt(moduleLinks.end());
			linkIt != endIt; ++linkIt)
	{
		EdgeType& edge = *linkIt->second;
		out << (edge.source.index+1) << " " << (edge.target.index+1) << " " << edge.data.flow << "\n";
	}
}

template<typename InfomapImplementation>
inline
void InfomapGreedy<InfomapImplementation>::sortTree(NodeBase& parent)
{
	if (parent.getSubInfomap() != 0)
	{
		parent.getSubInfomap()->sortTree();
	}
	std::multimap<double, NodeBase*, std::greater<double> > sortedModules;
	for (NodeBase::sibling_iterator childIt(parent.begin_child()), endChildIt(parent.end_child());
			childIt != endChildIt; ++childIt)
	{
		sortTree(*childIt);
		double rank = getNode(*childIt).data.flow;
		sortedModules.insert(std::pair<double, NodeBase*>(rank, childIt.base()));
	}
	parent.releaseChildren();
	unsigned int sortedIndex = 0;
	for (std::multimap<double, NodeBase*>::iterator it(sortedModules.begin()), itEnd(sortedModules.end());
			it != itEnd; ++it, ++sortedIndex)
	{
		parent.addChild(it->second);
		it->second->index = sortedIndex;
	}
}

template<typename InfomapImplementation>
inline
void InfomapGreedy<InfomapImplementation>::printSubInfomapTree(std::ostream& out, const TreeData& originalData, const std::string& prefix)
{
	unsigned int moduleIndex = 1;
	for (NodeBase::sibling_iterator moduleIt(root()->begin_child()), endIt(root()->end_child());
			moduleIt != endIt; ++moduleIt, ++moduleIndex)
	{
		std::ostringstream subPrefix;
		subPrefix << prefix << moduleIndex << ":";
		const std::string subPrefixStr = subPrefix.str();
		if (moduleIt->getSubInfomap() == 0)
			printSubTree(out, *moduleIt, originalData, subPrefixStr);
		else
			moduleIt->getSubInfomap()->printSubInfomapTree(out, originalData, subPrefixStr);
	}
}

template<typename InfomapImplementation>
inline
void InfomapGreedy<InfomapImplementation>::printSubTree(std::ostream& out, NodeBase& module, const TreeData& originalData, const std::string& prefix)
{
	if (module.isLeaf())
	{
		const NodeType& node = getNode(originalData.getLeafNode(module.originalIndex));
		out << prefix << " " << node.data.flow << " \"" << node.name << "\"\n";
		return;
	}

	unsigned int moduleIndex = 1;
	for (NodeBase::sibling_iterator childIt(module.begin_child()), endIt(module.end_child());
			childIt != endIt; ++childIt, ++moduleIndex)
	{
		const std::string subPrefixStr = io::Str() << prefix << moduleIndex << ":";
		if (childIt->getSubInfomap() == 0)
		{
			if (childIt->isLeaf())
			{
				const NodeType& node = getNode(originalData.getLeafNode(childIt->originalIndex));
				out << prefix << moduleIndex << " " << node.data.flow << " \"" << node.name << "\"\n";
			}
			else
			{
				printSubTree(out, *childIt, originalData, subPrefixStr);
			}
		}
		else
		{
			childIt->getSubInfomap()->printSubInfomapTree(out, originalData, subPrefixStr);
		}
	}
}

template<typename InfomapImplementation>
inline
void InfomapGreedy<InfomapImplementation>::printSubInfomapTreeDebug(std::ostream& out, const TreeData& originalData, const std::string& prefix)
{
	NodeType& node = getNode(*root());
//	out << prefix << " " << node.data.flow << " (" << node.data.exitFlow << ")\n";
//	out << prefix << " " << node.data.flow << " \"" <<
//			node.name << "\" (" << node.id << ")\n";
	out << prefix << " (flow: " << node.data.flow << ", enter: " <<
					node.data.enterFlow << ", exit: " << node.data.exitFlow <<
					", L: " << node.codelength << ")\n";
//	out << prefix << " (flow: " << node.data.flow << ", enter: " <<
//					node.data.enterFlow << ", exit: " << node.data.exitFlow << ")\n";


	unsigned int moduleIndex = 1;
	for (NodeBase::sibling_iterator moduleIt(root()->begin_child()), endIt(root()->end_child());
			moduleIt != endIt; ++moduleIt, ++moduleIndex)
	{
		std::ostringstream subPrefix;
		subPrefix << prefix << moduleIndex << ":";
		const std::string subPrefixStr = subPrefix.str();
		if (moduleIt->getSubInfomap() == 0)
			printSubTreeDebug(out, *moduleIt, originalData, subPrefixStr);
		else
			moduleIt->getSubInfomap()->printSubInfomapTreeDebug(out, originalData, subPrefixStr);
	}
}

template<typename InfomapImplementation>
inline
void InfomapGreedy<InfomapImplementation>::printSubTreeDebug(std::ostream& out, NodeBase& module, const TreeData& originalData, const std::string& prefix)
{
	if (module.isLeaf())
	{
		const NodeType& node = getNode(originalData.getLeafNode(module.originalIndex));
//		out << prefix << " " << node.data.flow <<
//								" (" << node.data.exitFlow << ") \"" << node.name << "\"\n";
//		out << prefix << " " << node.data.flow << " \"" <<
//				node.name << "\" (" << node.id << ")\n";
		out << prefix << " \"" << node.name << "\" (flow: " << node.data.flow << ", enter: " <<
				node.data.enterFlow << ", exit: " << node.data.exitFlow <<
				", L: " << node.codelength << ")\n";
//		out << prefix << " \"" << node.name << "\" (flow: " << node.data.flow << ", enter: " <<
//				node.data.enterFlow << ", exit: " << node.data.exitFlow << ")\n";
		return;
	}
	const FlowType& moduleData = getNode(module).data;
//	out << prefix << " " << moduleData.flow << " (" << moduleData.exitFlow << ")\n";
//	out << prefix << " " << moduleData.flow << " \"" <<
//					module.name << "\" (" << module.id << ")\n";
	out << prefix << " (flow: " << moduleData.flow << ", enter: " <<
			moduleData.enterFlow << ", exit: " << moduleData.exitFlow <<
			", L: " << module.codelength << ")\n";
//	out << prefix << " (flow: " << moduleData.flow << ", enter: " <<
//			moduleData.enterFlow << ", exit: " << moduleData.exitFlow << ")\n";

	unsigned int moduleIndex = 1;
	for (NodeBase::sibling_iterator childIt(module.begin_child()), endIt(module.end_child());
			childIt != endIt; ++childIt, ++moduleIndex)
	{
		const std::string subPrefixStr = io::Str() << prefix << moduleIndex << ":";
		if (childIt->getSubInfomap() == 0)
		{
			if (childIt->isLeaf())
			{
				const NodeType& node = getNode(originalData.getLeafNode(childIt->originalIndex));
//				out << prefix << moduleIndex << " " << node.data.flow <<
//						" (" << node.data.exitFlow << ") \"" << node.name << "\"\n";
//				out << prefix << moduleIndex << " " << node.data.flow <<
//						" \"" << node.name << "\" (" <<	node.id << ")\n";
				out << prefix << moduleIndex << " \"" << node.name << "\" (flow: " <<
						node.data.flow << ", enter: " << node.data.enterFlow << ", exit: " <<
						node.data.exitFlow << ", L: " << node.codelength << ")\n";
//				out << prefix << moduleIndex << " \"" << node.name << "\" (flow: " <<
//						node.data.flow << ", enter: " << node.data.enterFlow << ", exit: " <<
//						node.data.exitFlow << ")\n";

			}
			else
			{
				printSubTreeDebug(out, *childIt, originalData, subPrefixStr);
			}
		}
		else
		{
			childIt->getSubInfomap()->printSubInfomapTreeDebug(out, originalData, subPrefixStr);
		}
	}
}


/**
 * @additionalExitOldModuleIfMoved = additionalOutFlowOldModuleIfMoved + additionalInFlowOldModuleIfMoved;
 * @reductionInExitFlowNewModule = reductionInOutFlowFlowNewModule + reductionInInFlowFlowNewModule
 */
template<typename InfomapImplementation>
inline
double InfomapGreedy<InfomapImplementation>::getDeltaCodelength(NodeType& current, double additionalExitOldModuleIfMoved,
		unsigned int newModule, double reductionInExitFlowNewModule)
{
	using infomath::plogp;
	unsigned int oldModule = current.index;

	double delta_exit = plogp(enterFlow + additionalExitOldModuleIfMoved - reductionInExitFlowNewModule) - enterFlow_log_enterFlow;

	double delta_exit_log_exit = \
			- plogp(m_moduleFlowData[oldModule].exitFlow) \
			- plogp(m_moduleFlowData[newModule].exitFlow) \
			+ plogp(m_moduleFlowData[oldModule].exitFlow - current.data.exitFlow + additionalExitOldModuleIfMoved) \
			+ plogp(m_moduleFlowData[newModule].exitFlow + current.data.exitFlow - reductionInExitFlowNewModule);

	double delta_flow_log_flow = \
			- plogp(m_moduleFlowData[oldModule].exitFlow + m_moduleFlowData[oldModule].flow) \
			- plogp(m_moduleFlowData[newModule].exitFlow + m_moduleFlowData[newModule].flow) \
			+ plogp(m_moduleFlowData[oldModule].exitFlow + m_moduleFlowData[oldModule].flow \
					- current.data.exitFlow - current.data.flow + additionalExitOldModuleIfMoved) \
			+ plogp(m_moduleFlowData[newModule].exitFlow + m_moduleFlowData[newModule].flow \
					+ current.data.exitFlow + current.data.flow - reductionInExitFlowNewModule);

	double deltaL = delta_exit - 2.0*delta_exit_log_exit + delta_flow_log_flow;
	return deltaL;
}

template<typename InfomapImplementation>
void InfomapGreedy<InfomapImplementation>::calculateCodelengthFromActiveNetwork()
{
	//		nodeFlow_log_nodeFlow = 0.0;
	exit_log_exit = 0.0;
//	enter_log_enter = 0.0;
	enterFlow = 0.0;
	flow_log_flow = 0.0;

	// For each module
	unsigned int i = 0;
	for (activeNetwork_iterator it(m_activeNetwork.begin()), itEnd(m_activeNetwork.end());
			it != itEnd; ++it, ++i)
	{
		NodeType& node = getNode(**it);
		//			nodeFlow_log_nodeFlow += infomath::plogp(node.data.flow);
		// own node/module codebook
		flow_log_flow += infomath::plogp(node.data.flow + node.data.exitFlow);

		// use of index codebook
		enterFlow      += node.data.exitFlow;
//		enter_log_enter += infomath::plogp(node.data.enterFlow);
		exit_log_exit += infomath::plogp(node.data.exitFlow);
	}

	enterFlow += exitNetworkFlow;
	enterFlow_log_enterFlow = infomath::plogp(enterFlow);

//	codelength = enterFlow_log_enterFlow - 2.0*exit_log_exit + flow_log_flow - nodeFlow_log_nodeFlow;
	indexCodelength = enterFlow_log_enterFlow - exit_log_exit - exitNetworkFlow_log_exitNetworkFlow;
	moduleCodelength = -exit_log_exit + flow_log_flow - nodeFlow_log_nodeFlow;
	codelength = indexCodelength + moduleCodelength;
}

template<typename InfomapImplementation>
void InfomapGreedy<InfomapImplementation>::recalculateCodelengthFromActiveNetwork()
{
	RELEASE_OUT("########### Recalculate codelength from activenetwork: ############" << std::endl);
	exit_log_exit = 0.0;
	flow_log_flow = 0.0;
	enterFlow = 0.0;
	unsigned int numNodes = m_activeNetwork.size();
	for (unsigned int i = 0; i < numNodes; ++i)
	{
		m_moduleFlowData[i] = 0;
	}

	for (unsigned int i = 0; i < numNodes; ++i)
	{
		NodeType& current = getNode(*m_activeNetwork[i]);
		m_moduleFlowData[current.index].flow += current.data.flow;
		for (NodeBase::edge_iterator outEdgeIt(current.begin_outEdge()), endIt(current.end_outEdge());
				outEdgeIt != endIt; ++outEdgeIt)
		{
			EdgeType& edge = **outEdgeIt;
			NodeType& neighbour = getNode(edge.target);
			if (neighbour.index != current.index)
			{
				m_moduleFlowData[current.index].exitFlow += edge.data.flow;
			}
		}
	}

	using infomath::plogp;
	for (unsigned int i = 0; i < numNodes; ++i)
	{
		exit_log_exit += plogp(m_moduleFlowData[i].exitFlow);
		flow_log_flow += plogp(m_moduleFlowData[i].exitFlow + m_moduleFlowData[i].flow);
		enterFlow += m_moduleFlowData[i].exitFlow;
	}
	enterFlow += exitNetworkFlow;
	enterFlow_log_enterFlow = plogp(enterFlow);

//	codelength = enterFlow_log_enterFlow - enter_log_enter - exit_log_exit + flow_log_flow - nodeFlow_log_nodeFlow;
	indexCodelength = enterFlow_log_enterFlow - exit_log_exit - exitNetworkFlow_log_exitNetworkFlow;
	moduleCodelength = -exit_log_exit + flow_log_flow - nodeFlow_log_nodeFlow;
	codelength = indexCodelength + moduleCodelength;
}

template<typename InfomapImplementation>
void InfomapGreedy<InfomapImplementation>::recalculateCodelengthFromConsolidatedNetwork()
{
	exit_log_exit = 0.0;
	enter_log_enter = 0.0;
	flow_log_flow = 0.0;
	enterFlow = 0.0;

	RELEASE_OUT("########### Recalculate codelength from consolidated modular network: ############" << std::endl);
	// For each module
	for (NodeBase::sibling_iterator moduleIt(root()->begin_child()), endIt(root()->end_child());
			moduleIt != endIt; ++moduleIt)
	{
		NodeType& module = getNode(*moduleIt);

		// use of index codebook
		enterFlow      += module.data.enterFlow;
		enter_log_enter += infomath::plogp(module.data.enterFlow);
		exit_log_exit += infomath::plogp(module.data.exitFlow);
		// use of module codebook
		flow_log_flow += infomath::plogp(module.data.flow + module.data.exitFlow);
	}


	enterFlow += exitNetworkFlow;
	enterFlow_log_enterFlow = infomath::plogp(enterFlow);

//	double oldIndexCodelength = indexCodelength;
//	double oldModuleCodelength = moduleCodelength;
	indexCodelength = enterFlow_log_enterFlow - enter_log_enter - exitNetworkFlow_log_exitNetworkFlow;
	moduleCodelength = -exit_log_exit + flow_log_flow - nodeFlow_log_nodeFlow;
	codelength = indexCodelength + moduleCodelength;

	//DEBUG, many diffs > 1.0e-15 but almost none > 1.0e-14. All in coarse-tune
//	double diffIndexLength = std::abs(indexCodelength - oldIndexCodelength);
//	if (diffIndexLength > 1.0e-15)
//		RELEASE_OUT("##(indexLength +-" << diffIndexLength << "->" << indexCodelength << ")## ");
//	double diffModuleLength = std::abs(moduleCodelength - oldModuleCodelength);
//	if (diffModuleLength > 1.0e-15)
//		RELEASE_OUT("!!(moduleLength +-" << diffModuleLength << "->" << moduleCodelength << ")!! ");
//	if (std::abs(codelength - oldCodelength) > 1.0e-8)
//		RELEASE_OUT("## (codelength error > 1.0e-8!!) ## ");
}


template<typename InfomapImplementation>
void InfomapGreedy<InfomapImplementation>::resetModuleFlowFromLeafNodes()
{
	// Reset from top to bottom
	resetModuleFlow(*root());

	// Aggregate from bottom to top
	for (TreeData::leafIterator leafIt(m_treeData.begin_leaf()); leafIt != m_treeData.end_leaf(); ++leafIt)
	{
		NodeBase* node = *leafIt;
		double flow = getNode(*node).data.flow;
		while (node = node->parent, node != 0)
		{
			getNode(*node).data.flow += flow;
		}
	}
}

template<typename InfomapImplementation>
void InfomapGreedy<InfomapImplementation>::resetModuleFlow(NodeBase& node)
{
	getNode(node).data.flow = 0.0;
	for (NodeBase::sibling_iterator childIt(node.begin_child()), endIt(node.end_child());
			childIt != endIt; ++childIt)
	{
		if (!childIt->isLeaf())
			resetModuleFlow(*childIt);
	}
}

//template<typename InfomapImplementation>
//double InfomapGreedy<InfomapImplementation>::calcModuleCodelength(const NodeBase& parent)
//{
//	const FlowType& parentData = getNode(parent).data;
//	double parentFlow = parentData.flow;
//	double parentExit = parentData.exitFlow;
//	double totalParentFlow = parentFlow + parentExit;
//	double indexLength = 0.0;
//	if (totalParentFlow < 1e-16)
//		return 0.0;
//
//	// For each child
//	for (NodeBase::const_sibling_iterator childIt(parent.begin_child()), endIt(parent.end_child());
//			childIt != endIt; ++childIt)
//	{
//		indexLength -= infomath::plogp(getNode(*childIt).data.flow / totalParentFlow);
//	}
//	indexLength -= infomath::plogp(parentExit / totalParentFlow);
//
//	indexLength *= totalParentFlow;
//	return indexLength;
//}
//
//template<typename InfomapImplementation>
//double InfomapGreedy<InfomapImplementation>::calcModuleCodelength(const NodeBase& parent)
//{
//	const FlowType& parentData = getNode(parent).data;
//	double parentExit = parentData.exitFlow;
//	double indexLength = 0.0;
//	if (parentData.flow < 1e-16)
//		return 0.0;
//
//	double totalCodewordUse = parentExit; // rate of exit to coarser level
//	for (NodeBase::const_sibling_iterator childIt(parent.begin_child()), endIt(parent.end_child());
//			childIt != endIt; ++childIt)
//	{
//		totalCodewordUse += getNode(*childIt).data.enterFlow; // rate of enter to finer level
//	}
//
//	for (NodeBase::const_sibling_iterator childIt(parent.begin_child()), endIt(parent.end_child());
//			childIt != endIt; ++childIt)
//	{
//		indexLength -= infomath::plogp(getNode(*childIt).data.enterFlow / totalCodewordUse);
//	}
//	indexLength -= infomath::plogp(parentExit / totalCodewordUse);
//
//	indexLength *= totalCodewordUse;
//	return indexLength;
//}

template<typename InfomapImplementation>
double InfomapGreedy<InfomapImplementation>::calcCodelengthFromFlowWithinOrExit(const NodeBase& parent)
{
	const FlowType& parentData = getNode(parent).data;
	double parentFlow = parentData.flow;
	double parentExit = parentData.exitFlow;
	double totalParentFlow = parentFlow + parentExit;
	if (totalParentFlow < 1e-16)
		return 0.0;

	double indexLength = 0.0;
	// For each child
	for (NodeBase::const_sibling_iterator childIt(parent.begin_child()), endIt(parent.end_child());
			childIt != endIt; ++childIt)
	{
		indexLength -= infomath::plogp(getNode(*childIt).data.flow / totalParentFlow);
	}
	indexLength -= infomath::plogp(parentExit / totalParentFlow);

	indexLength *= totalParentFlow;
	return indexLength;
}

template<typename InfomapImplementation>
double InfomapGreedy<InfomapImplementation>::calcCodelengthFromEnterWithinOrExit(const NodeBase& parent)
{
	const FlowType& parentData = getNode(parent).data;
	double parentExit = parentData.exitFlow;
	if (parentData.flow < 1e-16)
		return 0.0;

	double sumEnter = 0.0;
	double sumEnterLogEnter = 0.0;
	for (NodeBase::const_sibling_iterator childIt(parent.begin_child()), endIt(parent.end_child());
			childIt != endIt; ++childIt)
	{
		const double& enterFlow = getNode(*childIt).data.enterFlow; // rate of enter to finer level
		sumEnter += enterFlow;
		sumEnterLogEnter += infomath::plogp(enterFlow);
	}
	// The possibilities from this module: Either exit to coarser level or enter one of its children
	double totalCodewordUse = parentExit + sumEnter;

	return infomath::plogp(totalCodewordUse) - sumEnterLogEnter - infomath::plogp(parentExit);
}

template<typename InfomapImplementation>
void InfomapGreedy<InfomapImplementation>::generateNetworkFromChildren(NodeBase& parent)
{
	exitNetworkFlow = 0.0;

	// Clone all nodes
	unsigned int numNodes = parent.childDegree();
	m_treeData.reserveNodeCount(numNodes);
	unsigned int i = 0;
	for (NodeBase::sibling_iterator childIt(parent.begin_child()), endIt(parent.end_child());
			childIt != endIt; ++childIt, ++i)
	{
		NodeBase* node = new NodeType(getNode(*childIt));
		node->originalIndex = childIt->originalIndex;
		m_treeData.addClonedNode(node);
		childIt->index = i; // Set index to its place in this subnetwork to be able to find edge target below
		node->index = i;
	}

//	double exitFlowFromLinks = 0.0;
	NodeBase* parentPtr = &parent;
	// Clone edges
//	typename flowData_traits<InfomapImplementation>::directed_type asdf;
	for (NodeBase::sibling_iterator childIt(parent.begin_child()), endIt(parent.end_child());
			childIt != endIt; ++childIt)
	{
		NodeBase& node = *childIt;
		for (NodeBase::edge_iterator outEdgeIt(node.begin_outEdge()), endIt(node.end_outEdge());
				outEdgeIt != endIt; ++outEdgeIt)
		{
			EdgeType edge = **outEdgeIt;
			// If neighbour node is within the same module, add the link to this subnetwork.
			if (edge.target.parent == parentPtr)
			{
				m_treeData.addEdge(node.index, edge.target.index, edge.data.weight, edge.data.flow);
			}
//			else
//			{
//				exitFlowFromLinks += edge.data.flow;
//			}
		}

		// Override for undirected network and add exit flow from in-links here.
		// TODO: Do it here with template specialization!
	}

	double parentExit = getNode(parent).data.exitFlow;

//	RELEASE_OUT("\nGenerate network from " << parent.name << "->" << parent.firstChild->name << ",.. " <<
//			"(flow: " << getNode(parent).data.flow << ", exit: " << parentExit << ")\n");

//	if (std::abs(exitNetworkFlow -  parentExit) > 1.0e-6)
//		RELEASE_OUT(" ###(netExit: " << exitNetworkFlow << "<->" << parentExit << ")## ");
//	if (std::abs(exitNetworkFlow -  parentExit) < 1.0e-10)
//		RELEASE_OUT("$" << m_subLevel << "$");
//	else
//		RELEASE_OUT("<" << m_subLevel << ">");
	// This method does not add edges out from the sub-network, thus in lower levels the total
	// out flow may be more than the sum of flow out from this sub-network.


	exitNetworkFlow = parentExit;
	exitNetworkFlow_log_exitNetworkFlow = infomath::plogp(exitNetworkFlow);
}


//template<typename InfomapImplementation, typename directed_type>
//void InfomapGreedy<InfomapImplementation>::cloneEdges(NodeBase* parent)
//{
//	for (NodeBase::sibling_iterator childIt(parent->begin_child()), endIt(parent->end_child());
//			childIt != endIt; ++childIt)
//	{
//		// If neighbour node is within the same module, add the link to this subnetwork.
//		NodeBase& node = *childIt;
//		for (NodeBase::edge_iterator outEdgeIt(node.begin_outEdge()), endIt(node.end_outEdge());
//				outEdgeIt != endIt; ++outEdgeIt)
//		{
//			EdgeType edge = **outEdgeIt;
//			if (edge.target.parent == parent)
//				m_treeData.addEdge(node.index, edge.target.index, edge.data.weight, edge.data.flow);
//		}
//	}
//}
//
//template<typename InfomapImplementation, typename directed_type>
//void InfomapGreedy<InfomapImplementation>::cloneEdges(NodeBase* parent)
//{
//	for (NodeBase::sibling_iterator childIt(parent->begin_child()), endIt(parent->end_child());
//			childIt != endIt; ++childIt)
//	{
//		// If neighbour node is within the same module, add the link to this subnetwork.
//		NodeBase& node = *childIt;
//		for (NodeBase::edge_iterator outEdgeIt(node.begin_outEdge()), endIt(node.end_outEdge());
//				outEdgeIt != endIt; ++outEdgeIt)
//		{
//			EdgeType edge = **outEdgeIt;
//			if (edge.target.parent == parent)
//				m_treeData.addEdge(node.index, edge.target.index, edge.data.weight, edge.data.flow);
//		}
//		for (NodeBase::edge_iterator inEdgeIt(node.begin_inEdge()), endIt(node.end_inEdge());
//				inEdgeIt != endIt; ++inEdgeIt)
//		{
//			EdgeType edge = **inEdgeIt;
//			if (edge.source.parent == parent)
//				m_treeData.addEdge(node.index, edge.target.index, edge.data.weight, edge.data.flow);
//		}
//	}
//}

template<typename InfomapImplementation>
inline
void InfomapGreedy<InfomapImplementation>::transformNodeFlowToEnterFlow(NodeBase* parent)
{
	for (NodeBase::sibling_iterator moduleIt(parent->begin_child()), endIt(parent->end_child());
			moduleIt != endIt; ++moduleIt)
	{
		NodeType& module = getNode(*moduleIt);
		module.data.flow = module.data.enterFlow;
	}
}

template<typename InfomapImplementation>
void InfomapGreedy<InfomapImplementation>::cloneFlowData(const NodeBase& source, NodeBase& target)
{
	getNode(target).data = getNode(source).data;
}

template<typename InfomapImplementation>
inline
typename InfomapGreedy<InfomapImplementation>::NodeType& InfomapGreedy<InfomapImplementation>::getNode(NodeBase& node)
{
	return static_cast<NodeType&>(node);
}

template<typename InfomapImplementation>
inline
const typename InfomapGreedy<InfomapImplementation>::NodeType& InfomapGreedy<InfomapImplementation>::getNode(const NodeBase& node) const
{
	return static_cast<const NodeType&>(node);
}

template<typename InfomapImplementation>
inline
unsigned int InfomapGreedy<InfomapImplementation>::numActiveModules()
{
	return m_activeNetwork.size() - m_emptyModules.size();
}

template<typename InfomapImplementation>
inline
unsigned int InfomapGreedy<InfomapImplementation>::numDynamicModules()
{
	return m_activeNetwork.size() - m_emptyModules.size();
}

template<typename InfomapImplementation>
inline
InfomapImplementation& InfomapGreedy<InfomapImplementation>::getImpl()
{
	return static_cast<InfomapImplementation&>(*this);
}


template<typename InfomapImplementation>
inline
void InfomapGreedy<InfomapImplementation>::printCodelengthTerms()
{
//	indexCodelength = enterFlow_log_enterFlow - exit_log_exit - exitNetworkFlow_log_exitNetworkFlow;
//	moduleCodelength = -exit_log_exit + flow_log_flow - nodeFlow_log_nodeFlow;
//	codelength = indexCodelength + moduleCodelength;

	std::cout << std::fixed << std::setprecision(18);
	std::cout << "===== Current codelength terms: =====" << std::endl;
	std::cout << "(" << numLeafNodes() << " nodes in " << numTopModules() << " modules. " <<
			m_activeNetwork.size() << " active nodes in " << numActiveModules() << " active modules.)" << std::endl;
	std::cout << "exitNetworkFlow: " << exitNetworkFlow << std::endl;
	std::cout << "exitNetworkFlow_log_exitNetworkFlow: " << exitNetworkFlow_log_exitNetworkFlow << std::endl;
	std::cout << "enterFlow: " << enterFlow << std::endl;
	std::cout << "enterFlow_log_enterFlow: " << enterFlow_log_enterFlow << std::endl;
	std::cout << "exit_log_exit: " << exit_log_exit << std::endl;
	std::cout << "flow_log_flow: " << flow_log_flow << std::endl;
	std::cout << "nodeFlow_log_nodeFlow: " << nodeFlow_log_nodeFlow << std::endl;
	double tmpIndexLength = enterFlow_log_enterFlow - exit_log_exit - exitNetworkFlow_log_exitNetworkFlow;
	double tmpModuleLength = -exit_log_exit + flow_log_flow - nodeFlow_log_nodeFlow;
	std::cout << "-> indexCodelength = enterFlow_log_enterFlow - exit_log_exit - exitNetworkFlow_log_exitNetworkFlow = " <<
			tmpIndexLength << std::endl;
	std::cout << "-> moduleCodelength = -exit_log_exit + flow_log_flow - nodeFlow_log_nodeFlow = " <<
			tmpModuleLength << std::endl;
	std::cout << "--> codelength = indexCodelength + moduleCodelength; = " << (tmpIndexLength+tmpModuleLength) << std::endl;
	std::cout << "Current codelength: " << indexCodelength << " + " << moduleCodelength << " = " << codelength << std::endl;
	std::cout << "------------------" << std::endl;
	std::cout << std::resetiosflags(std::ios::floatfield);
}

template<typename InfomapImplementation>
inline
void InfomapGreedy<InfomapImplementation>::printNodeData(NodeBase& node, std::ostream& out)
{
	NodeType& n = getNode(node);
	out << "flow: " << n.data.flow << ", exit: " << n.data.exitFlow;
}

template<>
inline
void InfomapGreedy<InfomapDirectedUnrecordedTeleportation>::printNodeData(NodeBase& node, std::ostream& out)
{
	NodeType& n = getNode(node);
	out << "flow: " << n.data.flow << ", enter: " << n.data.enterFlow << ", exit: " << n.data.exitFlow;
}

template<>
inline
void InfomapGreedy<InfomapUndirdir>::printNodeData(NodeBase& node, std::ostream& out)
{
	NodeType& n = getNode(node);
	out << "flow: " << n.data.flow << ", enter: " << n.data.enterFlow << ", exit: " << n.data.exitFlow;
}

template<typename InfomapImplementation>
inline
FlowDummy InfomapGreedy<InfomapImplementation>::getNodeData(NodeBase& node)
{
	return FlowDummy(getNode(node).data);
}

template<typename InfomapImplementation>
inline
void InfomapGreedy<InfomapImplementation>::getTopModuleRanks(std::vector<double>& ranks)
{
	unsigned int moduleIndex = 0;
	if (ranks.size() != root()->childDegree())
		ranks.resize(root()->childDegree());
	for (NodeBase::sibling_iterator moduleIt(root()->begin_child()), endIt(root()->end_child());
			moduleIt != endIt; ++moduleIt, ++moduleIndex)
	{
		ranks[moduleIndex] = getNode(*moduleIt).data.flow;
	}
}

#endif /* INFOMAPGREEDY_H_ */
