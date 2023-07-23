import React from 'react';
import { GraphView } from './graph-view';
import { GraphModel } from './graph-model';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        graph-view-test
      </header>
      <main>
        <GraphView 
          model={new GraphModel(
          [
            {label:"Узел 1.1", pos:[70, 70], color:"#AA1122"}, 
            {label:"Узел 2.1", pos:[130, 190], color:"#11DD33"},  
            {label:"Узел 2.2", pos:[180, 290], color:"#11DD33"}, 
            {label:"Узел 3.1", pos:[220, 120], color:"#0022FF"}, 
            {label:"Узел 3.2", pos:[300, 30], color:"#AAAA00"}, 
            {label:"Узел 3.3", pos:[350, 100], color:"#AAAA00"}, 
            {label:"Узел 4.1", pos:[250, 180], color:"#0022FF"}, 
            {label:"Узел 4.2", pos:[290, 260], color:"#0022FF"}, 
            {label:"Узел 5.1", pos:[450, 70], color:"#CC7700"}, 
            {label:"Узел 5.2", pos:[420, 180], color:"#CC7700"}
          ],
          [
            {from:0, to:1}, 
            {from:1, to:2},
            {from:1, to:3},
            {from:2, to:6},
            {from:2, to:7},
            {from:3, to:4},
            {from:3, to:5},
            {from:5, to:8},
            {from:5, to:9}
          ])}
          captionHeader={"Тестовый граф"}
          viewWidthPx={800}
          viewHeightPx={648}
        />
      </main>
      <footer>
        Test project 2023
      </footer>
    </div>
  );
}

export default App;
