// English comments and code as requested.
const fs = require('fs');
const path = require('path');

module.exports = function(app) {
  const plugin = {};
  plugin.id = 'signalk-ais-interceptor';
  plugin.name = 'AIS Interceptor';
  plugin.description = 'A webapp for AIS interception calculations.';

  plugin.start = function(options) {
    app.debug('Plugin started. Writing configuration to public directory...');

    try {
      // Define the target path for the configuration file inside the public folder.
      // __dirname is the absolute path to the directory containing this file (index.js).
      const configPath = path.join(__dirname, 'public', 'config.json');

      // Write the options received from Signal K server to the public config.json file.
      // The frontend will fetch this file directly.
      fs.writeFileSync(configPath, JSON.stringify(options, null, 2));

      app.debug('Successfully wrote configuration to:', configPath);
    } catch (e) {
      app.error('Failed to write public config.json file:', e);
    }
  };

  plugin.stop = function() {
    app.debug('Plugin stopped.');
  };

  // The schema is still required for the Admin UI to show the configuration fields.
  plugin.schema = {
    type: 'object',
    properties: {
      cruiseSpeed: {
        type: 'number',
        title: 'Cruising Speed',
        description: 'Your vessel\'s typical cruising speed (in knots)',
        default: 5
      },
      maxSpeed: {
        type: 'number',
        title: 'Max Speed',
        description: 'Your vessel\'s maximum speed (in knots)',
        default: 25
      }
    }
  };

  // No custom API routes are needed anymore. registerWithRouter can be removed.

  return plugin;
};