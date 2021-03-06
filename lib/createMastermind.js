'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createUpdaterParts = require('./createUpdaterParts');

var _createUpdaterParts2 = _interopRequireDefault(_createUpdaterParts);

var _createUpdaters = require('./createUpdaters');

var _createUpdaters2 = _interopRequireDefault(_createUpdaters);

var _configureFirebase = require('./configureFirebase');

var _configureFirebase2 = _interopRequireDefault(_configureFirebase);

var _configureReducers = require('./configureReducers');

var _configureReducers2 = _interopRequireDefault(_configureReducers);

var _Docs = require('./Docs');

var _Docs2 = _interopRequireDefault(_Docs);

var _redux = require('redux');

var _reduxLogger = require('redux-logger');

var _reduxLogger2 = _interopRequireDefault(_reduxLogger);

var _defaultUpdateSchemaCreators = require('./defaultUpdateSchemaCreators');

var _defaultUpdateSchemaCreators2 = _interopRequireDefault(_defaultUpdateSchemaCreators);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _reactRedux = require('react-redux');

var _reactNavigationReduxHelpers = require('react-navigation-redux-helpers');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var uuidv1 = require('uuid/v1');
var genericStoreUpdate = _defaultUpdateSchemaCreators2.default.genericStoreUpdate,
    genericApiUpdate = _defaultUpdateSchemaCreators2.default.genericApiUpdate,
    firebaseSignInWithEmail = _defaultUpdateSchemaCreators2.default.firebaseSignInWithEmail,
    firebaseSignOut = _defaultUpdateSchemaCreators2.default.firebaseSignOut,
    genericFirestoreUpdate = _defaultUpdateSchemaCreators2.default.genericFirestoreUpdate;

// TODO, add reduxConfig as an option to validate branches
// TODO validate operations against locations

exports.default = function (_ref) {
	var _ref$options = _ref.options,
	    options = _ref$options === undefined ? {} : _ref$options,
	    _ref$initialStoreStat = _ref.initialStoreState,
	    initialStoreState = _ref$initialStoreStat === undefined ? {} : _ref$initialStoreStat,
	    _ref$updateSchemaCrea = _ref.updateSchemaCreators,
	    updateSchemaCreators = _ref$updateSchemaCrea === undefined ? {} : _ref$updateSchemaCrea,
	    firebaseConfig = _ref.firebaseConfig,
	    _ref$selectors = _ref.selectors,
	    selectors = _ref$selectors === undefined ? {} : _ref$selectors,
	    AppNavigator = _ref.AppNavigator,
	    _ref$initialMobileScr = _ref.initialMobileScreenName,
	    initialMobileScreenName = _ref$initialMobileScr === undefined ? 'Login' : _ref$initialMobileScr;


	/*** INITIALIZE AND CHECK ARGUMENTS ***/

	// initialize options
	options = options || {};

	// initialize initialStoreState
	initialStoreState.appState = Object.assign({}, { isFetching: {}, errors: {}, modals: {} }, initialStoreState.appState || {});
	initialStoreState.auth = Object.assign({}, { user: {} }, initialStoreState.auth || {});
	initialStoreState.data = initialStoreState.data || {};

	// check that updateSchemaCreator is an object, if not throw TypeError
	if (updateSchemaCreators && (typeof updateSchemaCreators === 'undefined' ? 'undefined' : _typeof(updateSchemaCreators)) != 'object') {
		throw new TypeError('updateSchemaCreators must be an object', 'createMastermind.js');
	} else {

		// initialize two very generic updateSchemaCreators upon creation of a mastermind

		// for generic sync updates
		updateSchemaCreators.genericStoreUpdate = genericStoreUpdate;

		// for generic async updates
		updateSchemaCreators.genericApiUpdate = genericApiUpdate;
	}

	/*** CREATE STORE ***/

	var store = void 0;
	var addListener = void 0;

	/* TESTS */
	if (options.env == 'test') {

		// for tests
		store = (0, _redux.createStore)((0, _redux.combineReducers)((0, _configureReducers2.default)(initialStoreState)));

		/* WEB */
	} else if (options.env == 'web' || !options.env) {

		var _composeEnhancers = (typeof window === 'undefined' ? 'undefined' : _typeof(window)) === 'object' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({
			// Specify extension’s options like name, actionsBlacklist, actionsCreators, serialize...
		}) : _redux.compose;

		// for web projects
		store = (0, _redux.createStore)((0, _redux.combineReducers)((0, _configureReducers2.default)(initialStoreState)), _composeEnhancers((0, _redux.applyMiddleware)(_reduxLogger2.default)));

		/* MOBILE */
	} else if (options.env == 'mobile' && AppNavigator) {

		// setup adapted from https://reactnavigation.org/docs/redux-integration.html

		var initialMobileNavState = AppNavigator.router.getStateForAction(AppNavigator.router.getActionForPathAndParams(initialMobileScreenName));

		var navReducer = function navReducer() {
			var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : initialMobileNavState;
			var action = arguments[1];

			var nextState = AppNavigator.router.getStateForAction(action, state);
			return nextState || state;
		};

		var initialState = Object.assign({}, { nav: navReducer }, (0, _configureReducers2.default)(initialStoreState));

		var appReducer = (0, _redux.combineReducers)(initialState);

		var middleware = (0, _reactNavigationReduxHelpers.createReactNavigationReduxMiddleware)("root", function (state) {
			return state.nav;
		});

		addListener = (0, _reactNavigationReduxHelpers.createReduxBoundAddListener)("root");

		store = (0, _redux.createStore)(appReducer, (0, _redux.applyMiddleware)(middleware));
	} else {

		store = (0, _redux.createStore)((0, _redux.combineReducers)((0, _configureReducers2.default)(initialStoreState)), composeEnhancers((0, _redux.applyMiddleware)(_reduxLogger2.default)));
	}

	/*** CONFIGURE FIREBASE ***/

	// configure and initialize firebase if there is a config object
	var firebase = void 0;
	if (firebaseConfig) {
		firebase = (0, _configureFirebase2.default)(firebaseConfig);
		updateSchemaCreators.firebaseSignInWithEmail = firebaseSignInWithEmail;
		updateSchemaCreators.firebaseSignOut = firebaseSignOut;
		updateSchemaCreators.genericFirestoreUpdate = genericFirestoreUpdate;
	}

	// create mastermind infrastructure
	var updaterParts = (0, _createUpdaterParts2.default)({ store: store });
	var updaters = (0, _createUpdaters2.default)({ updaterParts: updaterParts, firebase: firebase });

	var listeningComponents = [];

	return {

		update: function update(updateSchemaName, updateArgs) {

			// check that user provides required name field
			if (!updateSchemaName) {
				console.log('must specify an update name');
				return;
			}

			// check that updateSchemaCreator is an object, if not throw TypeError
			if (typeof updateSchemaName != 'string') {
				throw new TypeError('updateSchemaName must be a string', 'createMastermind.js');
			}

			// check that user provides valid name
			if (!updateSchemaCreators[updateSchemaName]) {
				console.log('must provide a valid updateSchemaName');
				console.log('valid updateSchemaNames: ', Object.keys(updateSchemaCreators).sort());
				// fuzzy search possible names and give suggestion along with list of valid instructions
				return;
			}

			// create update schema
			var updateSchema = updateSchemaCreators[updateSchemaName](updateArgs);
			var type = updateSchema.type;

			// check that user provides required type field

			if (!type) {
				console.log('every updateSchema must specify a type');
				return;
			}

			// check that user provides valid processor type
			if (!updaters[type]) {
				console.log('must provide a updater');
				console.log('valid updaters: ', Object.keys(updaters).sort());
				// fuzzy search possible type and give suggestion alongwith list of valid instructions
				return;
			}

			var actionGroupKeys = ['actions', 'beforeActions', 'successActions', 'failureActions', 'afterActions', 'onChangeActions'];

			// log information about update
			// return new updaters[type](updateSchema)
			return new _bluebird2.default(function (resolve, reject) {
				resolve(updaters[type](updateSchema));
			}).then(function (res) {

				// // collect all locations affected to compare against what listeningComponents' locations
				// let locationsAffected = new Set()
				//
				// Object.keys(updateSchema).forEach((key) => {
				//
				// 	// get actionGroups from updateSchema
				// 	if (actionGroupKeys.includes(key)) {
				// 		const actionGroup = updateSchema[key] || {}
				//
				// 		// get actions from the actionGroups
				// 		Object.keys(actionGroup).forEach((actionName) => {
				//
				// 			const action = actionGroup[actionName]
				//
				// 			locationsAffected.add([action.type, ...action.location])
				// 		})
				// 	}
				// })
				//
				// const locationsAffectedArray = [...locationsAffected]
				//
				// // update listeningComponents
				// listeningComponents.forEach(component => {
				// 	locationsAffectedArray.forEach(locationAffected => {
				//
				// 		// compare arrays of same length, trim the longer array
				// 		const maxLocationLength = Math.min(component.location.length, locationAffected.length)
				// 		const componentLocationForComparison = component.location.slice(0, maxLocationLength)
				// 		const affectedLocationForComparison = locationAffected.slice(0, maxLocationLength)
				//
				// 		// compare the comparison locations
				// 		const locationsMatch = JSON.stringify(componentLocationForComparison) == JSON.stringify(affectedLocationForComparison)
				// 		if ( locationsMatch ) { component.component.forceUpdate() }
				//
				// 	})
				// })
				return res;
			});
		},

		addListener: addListener,

		// TODO: finish this
		createDocs: function createDocs() {
			return (0, _Docs2.default)({ updateSchemasCreators: updateSchemasCreators, actionCreators: actionCreators });
		},

		addToFeed: function addToFeed(component) {
			var location = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

			listeningComponents.push({ id: uuidv1(), component: component, location: location });
		},

		removeFromFeed: function removeFromFeed(id) {
			listeningComponents = listeningComponents.filter(function (component) {
				return component.id != id;
			});
		},

		createId: uuidv1,

		store: store,

		getState: store.getState,

		branch: function branch(branchName) {
			// add check and logging for valid branch name
			return store.getState()[branchName] ? store.getState()[branchName].toJS() : undefined;
		},

		// creates a mapStateToProps function for connected components
		// takes an array of strings
		connectStore: function connectStore(component, keys) {
			var shouldReturnAFunction = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;


			// function that maps store state to component props
			var mapStateToProps = function mapStateToProps(state) {

				// initialize return object
				var mappedState = {};

				// populate return object
				keys.forEach(function (key) {

					// add selector connection
					if (key.split(':').length === 2 && selectors[key.split(':')[1]]) {
						mappedState[key.split(':')[0]] = selectors[key.split(':')[1]](state);

						// add branch connection
					} else if (state[key]) {
						mappedState[key] = state[key].toJS();
					}
				});

				return shouldReturnAFunction ? function (state, props) {
					return mappedState;
				} : mappedState;
			};
			return (0, _reactRedux.connect)(mapStateToProps)(component);
		}
	};
};