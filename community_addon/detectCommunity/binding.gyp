{
	'targets': [
		{
			'target_name': 'detectCommunity',
			'sources': [
				'infomap/infomap/FlowCalculator.cpp',
				'infomap/infomap/InfomapBase.cpp',
				'infomap/infomap/InfomapContext.cpp',
				'infomap/infomap/InfomapDirected.cpp',
				'infomap/infomap/InfomapDirectedUnrecordedTeleportation.cpp',
				'infomap/infomap/InfomapGreedy.cpp',
				'infomap/infomap/InfomapUndirdir.cpp',
				'infomap/infomap/InfomapUndirected.cpp',
				'infomap/infomap/Network.cpp',
				'infomap/infomap/Node.cpp',
				'infomap/infomap/TreeData.cpp',
				'infomap/Infomap.cpp',
				'infomap/io/ClusterReader.cpp',
				'infomap/io/converters/LinkListConverter.cpp',
				'infomap/io/converters/PajekConverter.cpp',
				'infomap/io/DataConverterHelper.cpp',
				'infomap/io/Options.cpp',
				'infomap/io/ProgramInterface.cpp',
				'infomap/io/TreeDataWriter.cpp',
				'infomap/io/version.cpp',
				'infomap/utils/FileURI.cpp',
				'infomap/utils/Logger.cpp',
				'detectCommunity.cc',
			],
			'include_dirs': [
				'infomap/infomap',
				'infomap/io',
				'infomap/utils',
			],
			'conditions': [
				['OS=="linux"', {
					'cflags': [
						'-Wall',
						'-O3',
						'-pipe',
						'-fopenmp',
					],
					'ldflags': [
						'-fopenmp',
					],
				}],
			],
		},
	],
}