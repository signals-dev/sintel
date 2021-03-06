import logging

from bson import ObjectId
from flask_restful import Resource, reqparse

from sintel.db import schema
from sintel.resources.auth_utils import requires_auth

LOGGER = logging.getLogger(__name__)


def get_experiment(experiment_doc):
    # get basic information of this exp
    experiment = {
        'id': str(experiment_doc.id),
        'project': experiment_doc.project,
        'dataset': experiment_doc.dataset.name,
        'date_creation': experiment_doc.insert_time.isoformat(),
        'created_by': experiment_doc.created_by,
        'pipeline': experiment_doc.template.name,
        'name': experiment_doc.name,
        'dataruns': []
    }

    # get dataruns generated by this exp
    datarun_docs = schema.Datarun.find(experiment=experiment_doc.id)
    for datarun_doc in datarun_docs:

        signalrun_docs = schema.Signalrun.find(datarun=datarun_doc.id)
        for signalrun_doc in signalrun_docs:
            signalrun = {
                'id': str(signalrun_doc.id),
                'signal': signalrun_doc.signal.name,
                'events': []
            }

            # get events of this signalrun
            event_docs = schema.Event.find(signalrun=signalrun_doc.id)
            if event_docs is not None:
                for event_doc in event_docs:
                    # TODO
                    # annotation_doc = schema.Annotation.find_one(event=event_doc.id)
                    signalrun['events'].append({
                        'start_time': event_doc.start_time,
                        'stop_time': event_doc.stop_time,
                        'score': event_doc.severity,
                        'tag': event_doc.tag
                    })
                    # signalrun['events'][-1]['tag'] = \
                    #     None if annotation_doc is None else annotation_doc.tag

            # HACK: change datarun name
            experiment['dataruns'].append(signalrun)

    return experiment


def validate_experiment_id(experiment_id):
    try:
        eid = ObjectId(experiment_id)
    except Exception as e:
        LOGGER.exception(e)
        return {'message': str(e)}, 400

    experiment_doc = schema.Experiment.find_one(id=eid)

    if experiment_doc is None:
        message = 'Experiment {} does not exist'.format(experiment_id)
        LOGGER.exception(message)
        return {
            'message': message,
            'code': 400
        }, 400

    return experiment_doc, 200


class Experiment(Resource):

    @requires_auth
    def get(self, experiment_id):
        """
        Get an experiment by ID
        ---
        tags:
          - experiment
        security:
          - tokenAuth: []
        parameters:
          - name: experiment_id
            in: path
            schema:
              type: string
            required: true
            description: ID of the experiment to get
        responses:
          200:
            description: Experiment to be returned
            content:
              application/json:
                schema:
                  $ref: '#/components/schemas/Experiment'
          400:
            $ref: '#/components/responses/ErrorMessage'
          500:
            $ref: '#/components/responses/ErrorMessage'
        """

        # validate experiment_id
        validate_result = validate_experiment_id(experiment_id)
        if validate_result[1] == 400:
            return validate_result

        experiment_doc = validate_result[0]

        # return result
        try:
            res = get_experiment(experiment_doc)
        except Exception as e:
            LOGGER.exception(e)
            return {'message': str(e)}, 500
        else:
            return res


class Experiments(Resource):

    def __init__(self):
        parser_get = reqparse.RequestParser(bundle_errors=True)
        parser_get.add_argument('project', type=str, default=None,
                                location='args')
        self.parser_get = parser_get

    @requires_auth
    def get(self):
        """
        Get a list of experiments by [project]
        ---
        tags:
          - experiment
        security:
          - tokenAuth: []
        parameters:
          - name: project
            in: query
            schema:
              type: string
            description: Name of the project to filter
        responses:
          200:
            description: A list of experiments
            content:
              application/json:
                schema:
                  type: object
                  properties:
                    experiments:
                      type: array
                      items:
                        $ref: '#/components/schemas/Experiment'
          400:
            $ref: '#/components/responses/ErrorMessage'
          500:
            $ref: '#/components/responses/ErrorMessage'
        """

        try:
            args = self.parser_get.parse_args()
        except Exception as e:
            LOGGER.exception(str(e))
            return {'message', str(e)}, 400

        project = args['project']

        # make query dict
        query = dict()
        if project is not None and project != '':
            query['project'] = project

        experiment_docs = schema.Experiment.find(**query)

        try:
            experiments = [get_experiment(experiment_doc)
                           for experiment_doc in experiment_docs]
        except Exception as e:
            LOGGER.exception(e)
            return {'message': str(e)}, 500
        else:
            return {'experiments': experiments}
