
# Do basic logging init here so any early log events succeed without warning.
# Set the level to DEBUG so we know about all such early events.
# Logging will be reconfigured properly later (in init())

import logging
logging.getLogger().setLevel(logging.DEBUG)
logging.getLogger(__name__).setLevel(logging.DEBUG)
logging.basicConfig(disable_existing_loggers=False)
logging.captureWarnings(True)

