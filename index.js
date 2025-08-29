module.exports = function(app) {
  const plugin = {};
  plugin.id = 'signalk-ais-interceptor';
  plugin.name = 'AIS Interceptor';
  plugin.description = 'Plugin for the AIS Interceptor webapp';

  let pluginOptions = {}; // Variable to store the plugin's configuration

  plugin.start = function(options) {
    app.debug('AIS Interceptor plugin started.');
    pluginOptions = options; // Save the options when the plugin starts
  };

  plugin.stop = function() {
    app.debug('AIS Interceptor plugin stopped.');
  };

  // This defines the fields that will appear in the Plugin Config page
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
  
  // This creates an API endpoint for the frontend to fetch the configuration
  plugin.registerWithRouter = function(router) {
    router.get('/config', (req, res) => {
      res.json(pluginOptions);
    });
  };

  return plugin;
};