/* ------------------------------------------------------------------------

 Infomap software package for multi-level network clustering

 * Copyright (c) 2013
 * For license and authors, see README.txt or http://www.mapequation.org

------------------------------------------------------------------------ */

#ifndef TREEDATA_H_
#define TREEDATA_H_
#include "../io/IData.h"
#include <string>
#include <vector>
//#include "Edge.h"
#include "Node.h"
#include "NodeFactory.h"
#include <memory>

class TreeData : public IData
{
	friend class InfomapBase; // Expose m_leafNodes to InfomapBase to use as active network in fine-tune
public:
	typedef std::vector<NodeBase*>::iterator		leafIterator;
	typedef std::vector<NodeBase*>::const_iterator	const_leafIterator;
	typedef NodeBase::EdgeType						EdgeType;

	TreeData(NodeFactory*);
	virtual ~TreeData();

	void readFromSubNetwork(NodeBase* parent);

	// ---------------------------- Iterators and element access ----------------------------
	leafIterator begin_leaf()
	{ return m_leafNodes.begin(); }

	leafIterator end_leaf()
	{ return m_leafNodes.end(); }

	const_leafIterator begin_leaf() const
	{ return m_leafNodes.begin(); }

	const_leafIterator end_leaf() const
	{ return m_leafNodes.end(); }

	NodeBase* root()
	{ return m_root; }

	const NodeBase* root() const
	{ return m_root; }

	NodeBase& getLeafNode(unsigned int index)
	{
		ASSERT(index < m_leafNodes.size());
		return *m_leafNodes[index];
	}

	const NodeBase& getLeafNode(unsigned int index) const
	{
		ASSERT(index < m_leafNodes.size());
		return *m_leafNodes[index];
	}

	// ---------------------------- Capacity: ----------------------------

	unsigned int numLeafNodes() const
	{ return m_leafNodes.size(); }

	unsigned int numLeafEdges() const
	{ return m_numLeafEdges; }

	unsigned int calcSize();

	// ---------------------------- IData implementation ----------------------------

	virtual void reserveNodeCount(unsigned int nodeCount)
	{
		m_leafNodes.reserve(nodeCount);
	}

	virtual void reserveEdgeCount(unsigned int edgeCount)
	{
//		m_leafEdges.reserve(edgeCount);
	}

	void addNewNode(const NodeBase& other)
	{
		NodeBase* node = m_nodeFactory->createNode(other);
		m_root->addChild(node);
		node->originalIndex = m_leafNodes.size();
		m_leafNodes.push_back(node);
	}

	virtual void addNewNode(std::string name, double nodeWeight)
	{
		NodeBase* node = m_nodeFactory->createNode(name, nodeWeight);
		m_root->addChild(node);
		node->originalIndex = m_leafNodes.size();
		m_leafNodes.push_back(node);
	}

	void addClonedNode(NodeBase* node)
	{
		m_root->addChild(node);
		m_leafNodes.push_back(node);
	}

	virtual void addEdge(unsigned int sourceIndex, unsigned int targetIndex, double weight, double flow)
	{
		NodeBase* source = m_leafNodes[sourceIndex];
		NodeBase* target = m_leafNodes[targetIndex];
		source->addOutEdge(*target, weight, flow);
		++m_numLeafEdges;
//		EdgeType* edge = source->addOutEdge(*target, weight);
//		m_leafEdges.push_back(edge);
	}

	// ---------------------------- End IData implementation ----------------------------

private:
	std::auto_ptr<NodeFactory> m_nodeFactory;
	NodeBase* m_root;
	std::vector<NodeBase*> m_leafNodes;
	unsigned int m_numLeafEdges;
//	std::vector<EdgeType*> m_leafEdges;

};

#endif /* TREEDATA_H_ */
