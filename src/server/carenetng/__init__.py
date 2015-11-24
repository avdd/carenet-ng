
# first: set up logging so log events at import succeed

import logging
logging.getLogger().setLevel(logging.DEBUG)
logging.getLogger(__name__).setLevel(logging.DEBUG)
logging.basicConfig(disable_existing_loggers=False)
#logging.captureWarnings(True)

# log levels can be reset later in app configuration
# XXX: move into app config phase
#logging.getLogger('werkzeug').setLevel(logging.WARN)

# now import everything

import carenetng.login

