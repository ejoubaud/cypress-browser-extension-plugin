import './commands';

import createHelpers from '../../helpers';

// in regular usage we'd only need either the commands
// in ./commands or this, not both
// but here we test all the things
window.myExtension = createHelpers({ debug: true });
