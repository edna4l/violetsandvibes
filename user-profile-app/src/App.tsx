import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import ProfileSetup from './pages/ProfileSetup';

const App: React.FC = () => {
  return (
    <Router>
      <Switch>
        <Route path="/" component={ProfileSetup} />
      </Switch>
    </Router>
  );
};

export default App;