/* ------------------------------------------------------------------------

 Infomap software package for multi-level network clustering

 * Copyright (c) 2013
 * For license and authors, see README.txt or http://www.mapequation.org

------------------------------------------------------------------------ */

#include "Node.h"
#include "../utils/Logger.h"

#include "InfomapBase.h"

long NodeBase::s_nodeCount = 0;
unsigned long NodeBase::s_UID = 0;

SubStructure::SubStructure() : subInfomap(0), exploredWithoutImprovement(false) {}
SubStructure::~SubStructure() {}

NodeBase::NodeBase()
:	id(s_UID++),
 	name(),
 	index(0),
 	originalIndex(0),
	parent(0),
	previous(0),
	next(0),
	firstChild(0),
	lastChild(0),
	codelength(0.0),
	m_subStructure(),
	m_childDegree(0),
	m_childrenChanged(false),
	m_numLeafMembers(1)
{
	++s_nodeCount;
}

NodeBase::NodeBase(std::string name)
:	id(s_UID++),
 	name(name),
 	index(0),
 	originalIndex(0),
	parent(0),
	previous(0),
	next(0),
	firstChild(0),
	lastChild(0),
	codelength(0.0),
	m_subStructure(),
	m_childDegree(0),
	m_childrenChanged(false),
	m_numLeafMembers(1)
{
	++s_nodeCount;
}

NodeBase::NodeBase(const NodeBase& other)
:	id(s_UID++),
 	name(other.name),
 	index(0),
 	originalIndex(0),
	parent(0),
	previous(0),
	next(0),
	firstChild(0),
	lastChild(0),
	codelength(0.0),
	m_subStructure(),
	m_childDegree(0),
	m_childrenChanged(false),
	m_numLeafMembers(1)
{
	++s_nodeCount;
}

NodeBase::~NodeBase()
{
	deleteChildren();

	if (next != 0)
		next->previous = previous;
	if (previous != 0)
		previous->next = next;
	if (parent != 0)
	{
		if (parent->firstChild == this)
			parent->firstChild = next;
		if (parent->lastChild == this)
			parent->lastChild = previous;
	}

	// Delete outgoing edges.
	// TODO: Renders ingoing edges invalid. Assume or assert that all nodes on the same level are deleted?
	for (NodeBase::edge_iterator outEdgeIt(begin_outEdge());
			outEdgeIt != end_outEdge(); ++outEdgeIt)
	{
		delete *outEdgeIt;
	}

	--s_nodeCount;
	DEBUG_EXEC(
	if (s_nodeCount == 0)
		std::cout << "Deleted all tree nodes!" << std::endl;
	);
}

void NodeBase::deleteChildren()
{
	if (firstChild == 0)
		return;

	NodeBase::sibling_iterator nodeIt = begin_child();
	do
	{
		NodeBase* n = nodeIt.base();
		++nodeIt;
		delete n;
	}
	while (nodeIt.base() != 0);

	firstChild = 0;
	lastChild = 0;
}

void NodeBase::calcChildDegree()
{
	m_childrenChanged = false;
	if (firstChild == 0)
		m_childDegree = 0;
	else if (firstChild == lastChild)
		m_childDegree = 1;
	else
	{
		m_childDegree = 0;
		for (NodeBase::sibling_iterator childIt(begin_child()), endIt(end_child());
				childIt != endIt; ++childIt, ++m_childDegree);
	}
}
