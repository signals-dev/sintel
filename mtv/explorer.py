import logging
import os
import sys
import numpy as np
import pandas as pd

from datetime import datetime
from flask import Flask
from flask_cors import CORS

from gevent.pywsgi import WSGIServer
from mongoengine import connect
from termcolor import colored

from mtv.data.mdb import MongoDB
from mtv.data.processor import to_mongo_docs
from mtv.routes import add_routes
from mtv.utils import import_object, get_files

LOGGER = logging.getLogger(__name__)

class MTVExplorer:

    def __init__(self, cf):
        self._cf = cf.copy()

        self._db = connect(db=cf['db'], host=cf['host'], port=cf['port'],
                           username=cf['username'], password=cf['password'])

    def _init_flask_app(self, env):
        app = Flask(
            __name__,
            static_url_path='',
            static_folder='../client',
            template_folder='../client'
        )

        app.config.from_mapping(**self._cf)

        if env == 'production':
            app.config.from_mapping(DEBUG=False, TESTING=False)

        elif env == 'development':
            app.config.from_mapping(DEBUG=True, TESTING=True)

        elif env == 'test':
            app.config.from_mapping(DEBUG=False, TESTING=True)

        CORS(app)

        add_routes(app)

        return app

    def run_server(self, env, port):

        env = self._cf['ENV'] if env is None else env
        port = self._cf['server_port'] if port is None else port

        # env validation
        if env not in ['development', 'production', 'test']:
            LOGGER.exception("env '%s' is not in "
                             "['development', 'production', 'test']", env)
            raise ValueError

        # just in case running app with the absolute path
        sys.path.append(os.path.dirname(__file__))

        app = self._init_flask_app(env)

        LOGGER.info(colored('Starting up FLASK APP in {} mode'.format(env),
                            'yellow'))

        LOGGER.info(colored('Available on:', 'yellow') +
                    '  http://0.0.0.0:' + colored(port, 'green'))

        if env == 'development':
            app.run(debug = True, port=port)

        elif env == 'production':
            server = WSGIServer(('0.0.0.0', port), app, log=None)
            server.serve_forever()

    def run_module(self, module, args):
        try:
            func_object = module + '.main'
            func = import_object(func_object)
            func(*args)
        except Exception as e:
            LOGGER.exception("Error running the module '{}': {}"
                             .format(module, str(e)))

    def add_aggdata(self, path, col, start, stop, time_column,
                    value_column, header, interval):
        LOGGER.debug("time_column: {}, value_columne: {}, header: {}"
                     .format(time_column, value_column, header))

        conn = MongoDB(address=self._cf['host'], port=self._cf['port'],
                       db=self._cf['db'])

        if not os.path.exists(path):
            LOGGER.exception('Data folder path "{}" does not exist'
                            .format(path))
            raise

        files = get_files(path)

        count = 0
        for file in files:
            file_path = os.path.join(path, file)
            count += 1
            LOGGER.info('{}/{}: Processing {}'.format(count, len(files), file))

            # timestamp, value
            # data = pd.read_csv(file_path, header='infer')
            # data = data.sort_values('timestamp').set_index('timestamp')

            data = pd.read_csv(path, header=None)
            columns = {
                'timestamp': data[time_column].values,
                'value': data[value_column].values,
            }
            data = pd.DataFrame(columns)[['timestamp', 'value']]
            data['timestamp'] = data['timestamp'].astype(int)
            data['value'] = data['value'].astype(float)
            data = data.sort_values('timestamp').set_index('timestamp')

            if (start is not None):
                data = data.loc[start:]
            if (stop is not None):
                data = data.loc[:stop]
            
            docs = to_mongo_docs(file[0:-4], data, interval)

            if docs:
                conn.writeCollection(docs, col)

        conn.createIndex(col, [('dataset', '+')], unique=False)
        conn.createIndex(col, [('dataset', '+'), ('year', '+')])
