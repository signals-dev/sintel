import { createSelector } from 'reselect';
import { getExperimentsData } from './experiments';
import { isDatasetLoading, getDatasets } from './datasets';
import { getPipelinesData } from './pipelines';

const isProjectsLoading = createSelector(
    [getExperimentsData, getPipelinesData, isDatasetLoading],
    (experimentsData, pipelinesData, isLoadingDataset) =>
        experimentsData.ieExperimentsLoading || isLoadingDataset || pipelinesData.isPipelinesLoading);

const groupExperimentsByProj = (stack, criteria) => {
    const grouppedProjects = [];
    const grouppedStack = stack.reduce((result, currentValue) => {
        (result[currentValue[criteria]] = result[currentValue[criteria]] || []).push(currentValue);
        return result;
    }, []);

    Object.keys(grouppedStack).forEach(expGroup => {
        grouppedProjects.push({
            experimentNum: grouppedStack[expGroup].length,
            experiments: grouppedStack[expGroup],
            name: expGroup,
            // uniquePipelineNum: countPipelines(expGroup),
            signalNum: (function() {
                switch (expGroup) {
                    case 'SMAP': return 55;
                    case 'MSL': return 27;
                    default: // For SES
                        return 71;
                }
            }()),
        });
    });

    return grouppedProjects;
};

const addPipelines = (projectStack, pipelines) => projectStack.map(project => Object.assign(project, pipelines));

const getProjectsList = createSelector(
    [isProjectsLoading, getExperimentsData, getDatasets, getPipelinesData],
    (isLoadingProjects, experimentsData, dataSets, pipelinesData) => {
        if (isLoadingProjects) { return []; }
        let projectData = {};

        const grouppedExpByProject = groupExperimentsByProj(experimentsData.experimentsList.experiments, 'project');
        const projects = addPipelines(grouppedExpByProject, pipelinesData.pipelineList);

         projectData = {
            isProjectsLoading: isLoadingProjects,
            projects
        };

        return projectData;
    }
);

export const getProjectsData = createSelector(
    [isProjectsLoading, getProjectsList],
    (isLoadingProjects, projectsList) => {
        let projectData = {
            isProjectsLoading: isLoadingProjects,
            projectsList
        };
        return projectData;
    }
);
