import React from "react";
import { GraphModel, Node, Link } from "./graph-model";
import "./graph-view.css"

interface Props {
    model: GraphModel;
    captionHeader?: string;
    nodePxSize?: number;
    nodePxBorder?: number;
    linePxThickness?: number;
};

interface GraphViewData {
    canvas: {
        mouseData: {
            lastPosX: number;
            lastPosY: number;
        }
    }
}

interface State {
    canvas: {
        selfData: { 
            width: number;
            height: number;
            offsetX: number;
            offsetY: number;
        },
        nodeData: {
            selectedId: number;
            isDrag: boolean;
        }
    };
    caption: string;
    showComponent: boolean;
}

const GraphViewConfig = {
    fieldsIds: {
        nodeLabel: "node-label",
        nodePosX: "node-pos-x",
        nodePosY: "node-pos-y",
        nodeColor: "node-pos",
        nodeLinksFrom: "node-links-from",
        nodeLinksTo: "node-links-to"
    }
}

export class GraphView extends React.Component<Props, State> {
    static objectCounter: number = 0;

    private canvasObj!: HTMLCanvasElement;
    private canvasContext!: CanvasRenderingContext2D;
    
    private nodeOpsLabel!: HTMLInputElement;
    private nodeOpsPosX!: HTMLInputElement;
    private nodeOpsPosY!: HTMLInputElement;
    private nodeOpsColor!: HTMLInputElement;
    private nodeLinksFrom!: HTMLInputElement;
    private nodeLinksTo!: HTMLInputElement;
    private nodeLinks!: HTMLTableElement;

    private componentRef: React.RefObject<HTMLDivElement>;
    private canvasRef: React.RefObject<HTMLCanvasElement>;
    private nodeOptionsRef: React.RefObject<HTMLDivElement>;
    private linksOptionsRef: React.RefObject<HTMLTableElement>;
    
    private data: GraphViewData;
    private graphModel: GraphModel;
    private currentArrNodes: Array<Node>;
    private currentArrLinks: Array<Link>;

    private nodeSize: number;
    private nodeBorderSize: number;
    private lineThickness: number;

    constructor(props: Props) {
        super(props);

        this.data = {
            canvas: {
                mouseData: {
                    lastPosX: 0,
                    lastPosY: 0
                }
            }
        };

        this.state = {
            canvas: { 
                selfData: {
                    width: window.innerWidth,
                    height: window.innerHeight,
                    offsetX: 0,
                    offsetY: 0
                },
                nodeData: {
                    selectedId: -1,
                    isDrag: false
                },
            },
            showComponent: true,
            caption: `${props.captionHeader?.length ? props.captionHeader : `GRAPH_VIEW_${++GraphView.objectCounter}`}`
        };

        this.componentRef = React.createRef();
        this.canvasRef = React.createRef();
        this.nodeOptionsRef = React.createRef();
        this.linksOptionsRef = React.createRef();

        this.nodeSize = props.nodePxSize !== undefined ? props.nodePxSize : 7;
        this.nodeBorderSize = props.nodePxBorder !== undefined ? props.nodePxBorder : 2;
        this.lineThickness = props.linePxThickness !== undefined ? props.linePxThickness : 3;

        this.graphModel = props.model;
        this.currentArrNodes = this.graphModel.getNodes();
        this.currentArrLinks = this.graphModel.getLinks();

        this.handlerCanvasOnMouseDown.bind(this);
        this.handlerCanvasOnMouseUp.bind(this);
        this.handlerCanvasOnMouseOut.bind(this);
        this.handlerCanvasOnMouseMove.bind(this);
        this.handlerResize.bind(this);
        this.handlerScroll.bind(this);
    }

    private isNodeCatched(clientX: number, clientY: number, node: Node): boolean {

        let nodeLeft: number = node.pos[0] - this.nodeSize,
            nodeTop: number = node.pos[1] - this.nodeSize,
            nodeRight: number = node.pos[0] + this.nodeSize * 2,
            nodeBottom: number = node.pos[1] + this.nodeSize * 2;

        if (clientX > nodeLeft && 
            clientX < nodeRight &&
            clientY > nodeTop && 
            clientY < nodeBottom) {
            return true;
        }
        return false;
    }

    private handlerCanvasOnMouseDown(event: React.MouseEvent<HTMLCanvasElement>) {
        event.preventDefault();

        let clientPosX: number = event.clientX - this.state.canvas.selfData.offsetX;
        let clientPosY: number = event.clientY - this.state.canvas.selfData.offsetY;


        for(let i = 0; i < this.currentArrNodes.length; ++i)
        {
            if(this.isNodeCatched(clientPosX, clientPosY, this.currentArrNodes[i])) {
                
                this.setState(prevState => ({
                    ...prevState,
                    canvas: {
                        ...prevState.canvas,
                        nodeData: {
                            selectedId: i, 
                            isDrag: true
                        }, 
                    }
                }));
                
                this.data = {
                    canvas: {
                        mouseData: {
                            lastPosX: this.currentArrNodes[i].pos[0], 
                            lastPosY: this.currentArrNodes[i].pos[1]
                        }
                    }
                };

                console.log(this.state.canvas.nodeData.selectedId);
                this.update();
                return;
            }
        }
        
        this.setState(prevState => ({
            ...prevState,
            canvas: {
                ...prevState.canvas,
                nodeData: {
                    selectedId: -1, 
                    isDrag: false
                }
            }
        }));
        console.log(this.state.canvas.nodeData.selectedId);
        this.update();
    }

    private handlerCanvasOnMouseUp(event: React.MouseEvent<HTMLCanvasElement>) {
        if(!this.state.canvas.nodeData.isDrag) {
            return;
        }

        event.preventDefault();
        this.setState(prevState => ({
            ...prevState,
            canvas: {
                ...prevState.canvas,
                nodeData: {
                    ...prevState.canvas.nodeData,
                    isDrag: false
                }
            }
        }));
        this.graphModel.setNodesAndLinks(this.currentArrNodes, this.currentArrLinks);

        this.update();
    }

    private handlerCanvasOnMouseOut(event: React.MouseEvent<HTMLCanvasElement>) {
        if(!this.state.canvas.nodeData.isDrag) {
            return;
        }
        
        event.preventDefault();
        this.setState(prevState => ({
            ...prevState,
            canvas: {
                ...prevState.canvas,
                nodeData: {
                    ...prevState.canvas.nodeData,
                    isDrag: false
                }
            }
        }));
        this.graphModel.setNodesAndLinks(this.currentArrNodes, this.currentArrLinks);

        this.update();
    }

    private handlerCanvasOnMouseMove(event: React.MouseEvent<HTMLCanvasElement>) {
        if (!this.state.canvas.nodeData.isDrag) {
            return;
        }
        
        event.preventDefault();
        let clientPosX: number = event.clientX - this.state.canvas.selfData.offsetX;
        let clientPosY: number = event.clientY - this.state.canvas.selfData.offsetY;

        let deltaX: number = clientPosX - this.data.canvas.mouseData.lastPosX;
        let deltaY: number = clientPosY - this.data.canvas.mouseData.lastPosY;

        this.currentArrNodes[this.state.canvas.nodeData.selectedId].pos[0] += deltaX;
        this.currentArrNodes[this.state.canvas.nodeData.selectedId].pos[1] += deltaY;

        this.data = {
            ...this.data,
            canvas: {
                ...this.data.canvas,
                mouseData: {
                    lastPosX: this.currentArrNodes[this.state.canvas.nodeData.selectedId].pos[0], 
                    lastPosY: this.currentArrNodes[this.state.canvas.nodeData.selectedId].pos[1]
                }            
            }
        };
        this.update();
    }

    private handlerAddLink() {
        let fromValue: number = parseInt(this.nodeLinksFrom.value),
            toValue: number = parseInt(this.nodeLinksTo.value!);
        let newLink: Link = {from: fromValue, to: toValue};
        if(this.graphModel.addLink(newLink) < 0) {
            alert("Введены неверные значения, либо такая связь уже существует!");
        }
        this.update();
    }

    private handlerRemoveLink(index: number) {
        const removeTableRow = this.nodeLinks.querySelector(`tr[data-index=${index}`);
        removeTableRow?.remove();
        this.graphModel.removeLink(index);
        this.update();
    }

    private handlerAddNode() {
        let nodeLabel: string = this.nodeOpsLabel.value,
            nodePosX: number = parseInt(this.nodeOpsPosX.value),
            nodePosY: number = parseInt(this.nodeOpsPosY.value),
            nodeColor: string = this.nodeOpsColor.value;
        let newNode : Node = {
            label: nodeLabel,
            pos: [nodePosX, nodePosY],
            color: nodeColor
        };
        if((this.state.canvas.nodeData.selectedId = this.graphModel.addNode(newNode)) < 0){
            alert("Введены неверные значения нового узла!");
        }
        this.update();
    }

    private handlerRemoveNode() {
        this.graphModel.removeNode(this.state.canvas.nodeData.selectedId);
        this.update();
    }

    private handlerHideGraphView(){
        this.setState(prevState => ({
            ...prevState,
            showComponent: false
        }));
    }

    public handlerResize() {
        let canvasOffsetData = this.canvasObj.getBoundingClientRect();
        let canvasOffsetX: number = canvasOffsetData.left;
        let canvasOffsetY: number = canvasOffsetData.top;

        this.setState(prevState => ({
            ...prevState,
            canvas: {
                ...prevState.canvas,
                selfData:
                {
                    width: window.innerWidth - canvasOffsetX, 
                    height: window.innerHeight - canvasOffsetY,
                    offsetX: canvasOffsetX,
                    offsetY: canvasOffsetY
                }
            }
        }), () => this.update());
    }
    
    public handlerScroll() {
        let canvasOffsetData = this.canvasObj.getBoundingClientRect();
        let canvasOffsetX: number = canvasOffsetData.left;
        let canvasOffsetY: number = canvasOffsetData.top;

        this.setState(prevState => ({
            ...prevState,
            canvas: {
                ...prevState.canvas,
                selfData:
                {
                    ...prevState.canvas.selfData,
                    offsetX: canvasOffsetX,
                    offsetY: canvasOffsetY
                }
            }
        }), () => this.update());
    }

    private drawNode(node: Node, isSelected: boolean = false) {
        // отрисовка границ узла
        this.canvasContext.fillStyle = node.color;
        this.canvasContext.fillRect(
            node.pos[0] - this.nodeSize - this.nodeBorderSize * 2, 
            node.pos[1] - this.nodeSize - this.nodeBorderSize * 2, 
            this.nodeSize * 2 + this.nodeBorderSize * 2, 
            this.nodeSize * 2 + this.nodeBorderSize * 2);
        // если узел выделен то граница "белая", иначе "угольная"
        this.canvasContext.fillStyle = isSelected ? "#FFFFFF" : "#333333";
        this.canvasContext.fillRect(
            node.pos[0] - this.nodeSize - this.nodeBorderSize, 
            node.pos[1] - this.nodeSize - this.nodeBorderSize, 
            this.nodeSize * 2 + this.nodeBorderSize - this.nodeBorderSize, 
            this.nodeSize * 2 + this.nodeBorderSize - this.nodeBorderSize);

        // отрисовка тела узла (квадрат)
        this.canvasContext.fillStyle = node.color;
        this.canvasContext.fillRect(
            node.pos[0] - this.nodeSize, 
            node.pos[1] - this.nodeSize, 
            this.nodeSize * 2 - this.nodeBorderSize * 2, 
            this.nodeSize * 2 - this.nodeBorderSize * 2);
        
        // Описание узла
        this.canvasContext.font = `${this.nodeSize}pt Verdana`;
        this.canvasContext.textAlign = "center";
        this.canvasContext.fillText(node.label, node.pos[0], node.pos[1] + this.nodeSize * 2.5);
    }

    private drawLink(nodeFrom: Node, nodeTo: Node) {
        this.canvasContext.lineWidth = this.lineThickness;
        this.canvasContext.beginPath();
        this.canvasContext.moveTo(nodeFrom.pos[0], nodeFrom.pos[1]);
        this.canvasContext.lineTo(nodeTo.pos[0], nodeTo.pos[1]);
        this.canvasContext.strokeStyle = nodeFrom.color;
        this.canvasContext.stroke();
        this.canvasContext.closePath();
    }

    public update() {
        if (this.canvasContext === null || this.canvasContext === undefined ||
            this.currentArrNodes === null || this.currentArrNodes === undefined) {
            return;
        }

        this.canvasContext.clearRect(0, 0, this.state.canvas.selfData.width, this.state.canvas.selfData.height);
        if (this.currentArrLinks.length > -1) {
            for (let i = 0; i < this.currentArrLinks.length; ++i) {
                this.drawLink(this.currentArrNodes[this.currentArrLinks[i].from], this.currentArrNodes[this.currentArrLinks[i].to]);
            }
        }

        for (let i = 0; i < this.currentArrNodes.length; ++i) {
            this.drawNode(this.currentArrNodes[i], this.state.canvas.nodeData.selectedId === i ? true : false);
        }
    }

    public componentWillUnmount() {
        window.removeEventListener("resize", () => this.handlerResize());
        window.removeEventListener("scroll", () => this.handlerScroll());
        this.canvasObj.removeEventListener("scroll", () => this.handlerScroll());
        if(this.componentRef.current!.parentNode) {
            this.componentRef.current!.parentNode.removeEventListener("scroll", () => this.handlerScroll());
        }
    }

    public componentDidMount() {
        if (this.canvasRef.current !== null) {
            const tempCanvasElement = this.canvasRef.current;
            this.canvasObj = tempCanvasElement;
            window.addEventListener("resize", () => this.handlerResize());
            window.addEventListener("scroll", () => this.handlerScroll());
            this.canvasObj.addEventListener("scroll", () => this.handlerScroll());
            if(this.componentRef.current!.parentNode) {
                this.componentRef.current!.parentNode.addEventListener("scroll", () => this.handlerScroll());
            }
            const tempContext = this.canvasRef.current.getContext("2d");
            if(tempContext !== null) {
                this.canvasContext = tempContext;
                this.update();
            }
        } 

        if (this.nodeOptionsRef.current !== null) {
            this.nodeOpsLabel =  this.nodeOptionsRef.current.querySelector(`input#${GraphViewConfig.fieldsIds.nodeLabel}`)!;
            this.nodeOpsPosX =   this.nodeOptionsRef.current.querySelector(`input#${GraphViewConfig.fieldsIds.nodePosX}`)!;
            this.nodeOpsPosY =   this.nodeOptionsRef.current.querySelector(`input#${GraphViewConfig.fieldsIds.nodePosY}`)!;
            this.nodeOpsColor =  this.nodeOptionsRef.current.querySelector(`input#${GraphViewConfig.fieldsIds.nodeColor}`)!;
            this.nodeLinksFrom = this.nodeOptionsRef.current.querySelector(`input#${GraphViewConfig.fieldsIds.nodeLinksFrom}`)!;
            this.nodeLinksTo =   this.nodeOptionsRef.current.querySelector(`input#${GraphViewConfig.fieldsIds.nodeLinksTo}`)!;
        } 

        if (this.linksOptionsRef.current !== null) {
            this.nodeLinks = this.linksOptionsRef.current
        }
        this.handlerResize();
    }

    public render() {
        return (
            this.state.showComponent && <div className="graph-view-container" ref={this.componentRef}>
                <div className="graph-view-caption">{this.state.caption}</div>
                <input type="button" id="graph-view-close" value="X" onClick={() => this.handlerHideGraphView()}/>
                <canvas 
                    ref={this.canvasRef}
                    width={this.state.canvas.selfData.width} 
                    height={this.state.canvas.selfData.height}
                    onMouseDown={(evt) => this.handlerCanvasOnMouseDown(evt)}
                    onMouseUp={(evt) => this.handlerCanvasOnMouseUp(evt)}
                    onMouseOut={(evt) => this.handlerCanvasOnMouseOut(evt)}
                    onMouseMove={(evt) => this.handlerCanvasOnMouseMove(evt)}    
                />
                <div className="graph-view-control" ref={this.nodeOptionsRef}>
                    <h4>Добавление узлов</h4>
                    <div className="graph-view-control-row-container">
                        <input type="button" value="Добавить" onClick={() => this.handlerAddNode()}/>
                        <input type="button" value="Удалить" onClick={() => this.handlerRemoveNode()}/>
                    </div>
                    { this.state.canvas.nodeData.selectedId >= 0 && <div className="graph-node-control">
                        <h4>Настройка узла {`[${this.state.canvas.nodeData.selectedId}] : ` + this.currentArrNodes[this.state.canvas.nodeData.selectedId].label}</h4>
                        <label htmlFor={GraphViewConfig.fieldsIds.nodeLabel}>Наименование узла:</label>
                        <input type="text" placeholder="sample_node_<N>" id={GraphViewConfig.fieldsIds.nodeLabel} value={this.currentArrNodes[this.state.canvas.nodeData.selectedId].label}/>
                        <div className="graph-view-control-row-container">
                            <div>
                                <label htmlFor={GraphViewConfig.fieldsIds.nodePosX}>X:</label>
                                <input type="text" placeholder="X" id={GraphViewConfig.fieldsIds.nodePosX} value={this.currentArrNodes[this.state.canvas.nodeData.selectedId].pos[0]}/>
                            </div>
                            <div>
                                <label htmlFor={GraphViewConfig.fieldsIds.nodePosY}>Y:</label>
                                <input type="text" placeholder="Y" id={GraphViewConfig.fieldsIds.nodePosY} value={this.currentArrNodes[this.state.canvas.nodeData.selectedId].pos[1]}/>
                            </div>
                        </div>
                        <label htmlFor={GraphViewConfig.fieldsIds.nodeColor}>Цвет узла:</label>
                        <input type="text" placeholder="#000000" id={GraphViewConfig.fieldsIds.nodeColor} value={this.currentArrNodes[this.state.canvas.nodeData.selectedId].color}/>
                        <label htmlFor="node-links">Связи узла:</label>
                        <table id="node-links" ref={this.linksOptionsRef}>
                            <tr>
                                <th>От</th>
                                <th>До</th>
                                <th>-</th>
                            </tr>
                            {this.currentArrLinks.map(
                                (element,index) => element.from === this.state.canvas.nodeData.selectedId || element.to === this.state.canvas.nodeData.selectedId ?
                                <tr data-index={index}>
                                    <td>{this.currentArrNodes[element.from].label}</td>
                                    <td>{this.currentArrNodes[element.to].label}</td>
                                    <td><input type="button" value="X" onClick={() => this.handlerRemoveLink(index)}/></td>
                                </tr> 
                            : "")}
                            <tr>
                                <td><input type="text" placeholder="ID узла от" id={GraphViewConfig.fieldsIds.nodeLinksFrom}/></td>
                                <td><input type="text" placeholder="ID узла до" id={GraphViewConfig.fieldsIds.nodeLinksTo}/></td>
                                <td><input type="button" id="node-link-add" value="Добавить" onClick={() => this.handlerAddLink()}/></td>
                            </tr>
                        </table>
                    </div>}
                </div>
            </div>
        );
    }
}

