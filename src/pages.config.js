/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import ActivityLog from './pages/ActivityLog';
import Advertisers from './pages/Advertisers';
import Areas from './pages/Areas';
import Dashboard from './pages/Dashboard';
import GeoTargeting from './pages/GeoTargeting';
import Groups from './pages/Groups';
import Layouts from './pages/Layouts';
import Locations from './pages/Locations';
import Media from './pages/Media';
import Player from './pages/Player';
import Playlists from './pages/Playlists';
import Reports from './pages/Reports';
import Scheduling from './pages/Scheduling';
import Screens from './pages/Screens';
import Settings from './pages/Settings';
import SharedReport from './pages/SharedReport';
import SimpleTest from './pages/SimpleTest';
import TestScreen from './pages/TestScreen';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ActivityLog": ActivityLog,
    "Advertisers": Advertisers,
    "Areas": Areas,
    "Dashboard": Dashboard,
    "GeoTargeting": GeoTargeting,
    "Groups": Groups,
    "Layouts": Layouts,
    "Locations": Locations,
    "Media": Media,
    "Player": Player,
    "Playlists": Playlists,
    "Reports": Reports,
    "Scheduling": Scheduling,
    "Screens": Screens,
    "Settings": Settings,
    "SharedReport": SharedReport,
    "SimpleTest": SimpleTest,
    "TestScreen": TestScreen,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};