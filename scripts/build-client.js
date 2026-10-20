// Production source maps expose application source in publicly served files.
process.env.GENERATE_SOURCEMAP = 'false';
require('react-scripts/scripts/build');
