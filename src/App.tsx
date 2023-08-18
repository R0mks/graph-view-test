import { GraphModel, Node as GraphNode, Link as GraphLink } from './graph-model';
import { GraphView } from './graph-view';
import './App.css';

interface viewResolution {
  width: number, 
  height:number
}

interface GenerationOptions {
  modelCount: number;
  graphViewCount: number;
  nodesCount: {
    min: number;
    max: number;
  },
  linksCount: {
    min: number;
    max: number;
  }, 
  viewResolutions: Array<viewResolution>
}

const generationOps: GenerationOptions = {
  modelCount: 3,
  graphViewCount: 10,
  nodesCount: {
    min:5,
    max:10
  },
  linksCount: {
    min:1,
    max:10
  },
  viewResolutions: [
    {width:320, height:240},
    {width:640, height:480},
    {width:800, height:600}
  ]
} 

function getRandValBetween(min: number, max: number): number {
  if (min > max) {
    throw new Error("Значение min больше max");
  }
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function getRandHexColor(): string {
  return '#'+(Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0');
}

function getFactorial(number: number): number {
  return number != 1 ? number * getFactorial(number - 1) : 1;
}

function floorLinkCombs(nodesCnt: number, linksCount: number): number {
  let possibleCombinations:  number = getFactorial(nodesCnt) / ( getFactorial(2) * getFactorial(nodesCnt - 2) );
  return possibleCombinations < linksCount ? possibleCombinations : linksCount;  
}

function App() {
  
  // Генерация списка graphModel  
  let graphModelList: Array<{model: GraphModel, viewResolution: viewResolution}> = [];
  if (generationOps.modelCount > 0) { 
    for(let i = 0; i < generationOps.modelCount; ++i) {
      let nodesList: Array<GraphNode> = [];
      let linksList: Array<GraphLink> = [];
      
      let tempLinksList: Array<GraphLink> = new Array<GraphLink>();

      let nodesCount: number = getRandValBetween(generationOps.nodesCount.min, generationOps.nodesCount.max);
      let linksCount: number = floorLinkCombs(nodesCount, getRandValBetween(generationOps.linksCount.min, generationOps.linksCount.max)); // Если случайное значение по указанным в опциях параметрам получается больше чем возможно максимальное кол-во связей, то происходит "округление" до этого макс. возможного числа 
      let resolutionIdx: number = getRandValBetween(1, generationOps.viewResolutions.length - 1);

      // Заполнение списка узлов
      for (let j = 0; j < nodesCount; ++j) {
        let currNodeColor: string = getRandHexColor();
        let currNodePos: Array<number> = [ getRandValBetween(0, generationOps.viewResolutions[resolutionIdx].width),
                                           getRandValBetween(0, generationOps.viewResolutions[resolutionIdx].height) ];
        let currNodeLabel: string = currNodeColor;
        nodesList.push({
          label: currNodeLabel, 
          pos: currNodePos, 
          color: currNodeColor
        });
      }

      // Генерация множества возможных связей (ссылки)
      for (let j = 0; j < nodesCount - 1; ++j) {
        for (let k = j + 1; k < nodesCount ; ++k) {
          tempLinksList.push({
            from:j, 
            to:k
          });
        }
      }

      // Заполнение списка связей (ссылки)
      for (let j = 0; j < linksCount; ++j) {
        let tmpLinksIndex: number = getRandValBetween(0, tempLinksList.length - 1);
        linksList.push(tempLinksList[tmpLinksIndex]);
        tempLinksList.splice(tmpLinksIndex,1);
      }
      graphModelList.push({ 
        model: new GraphModel(nodesList, linksList), 
        viewResolution: generationOps.viewResolutions[resolutionIdx]
      });
    }
  }

  // Генерация списка graphView
  let graphViewList: Array<JSX.Element> = [];
  if(generationOps.graphViewCount > 0) {
    for(let i = 0; i < generationOps.graphViewCount; ++i) {
      let modelIdx: number = getRandValBetween(0, graphModelList.length - 1);
      console.log(graphModelList[modelIdx].model);
      graphViewList.push(
        <GraphView
          model={graphModelList[modelIdx].model}
          viewWidthPx={graphModelList[modelIdx].viewResolution.width}
          viewHeightPx={graphModelList[modelIdx].viewResolution.height}
          captionHeader={`NodesCount: ${graphModelList[modelIdx].model.getNodes().length}; LinksCount: ${graphModelList[modelIdx].model.getLinks().length}`}
        />
      );
      
    }
  }

  return (
    <div className="App">
      <header className="App-header">
        graph-view-test
      </header>
      <main>
        { graphViewList }
      </main>
      <footer>
        Test project 2023
      </footer>
    </div>
  );
}

export default App;
