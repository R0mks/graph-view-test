import { toHaveFocus } from "@testing-library/jest-dom/matchers";
import React from "react";
import { getDefaultCompilerOptions } from "typescript";
import { GraphModel, Node, Link } from "./graph-model";
import "./graph-view.css"

interface Props {
    model: GraphModel;
    viewWidthPx: number;
    viewHeightPx: number;
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
    container: {
        width: number;
        height: number;
    },
    canvas: {
        selfData: { 
            width: number;
            height: number;
            offsetX: number;
            offsetY: number;
        },
        nodeData: {
            selectedNode: Node | null,
            selectedId: number;
            isDrag: boolean;
        }
    };
    showComponent: boolean;
}

const GraphViewConfig = {
    fieldsAttrIds: {
        nodeLabel: "node-label",
        nodePosX: "node-pos-x",
        nodePosY: "node-pos-y",
        nodeColor: "node-pos",
        nodeLinks: "node-links",
        nodeLinksFrom: "node-links-from",
        nodeLinksTo: "node-links-to"
    },
    defaultValues: {
        captionHeader: 'GRAPH_VIEW'
    }
}

const getStylePropNumberValue = function (objStyle: CSSStyleDeclaration, property: string): number {
    const tempProperty: string = objStyle.getPropertyValue(property).match(/\d+/)![0];
    return tempProperty !== null ? parseInt(tempProperty) : 0;
}

export class GraphView extends React.Component<Props, State> {
    private static objectUnnamedCounter: number = 0;
    private static defaultProps: Partial<Props> = {
        captionHeader:  GraphViewConfig.defaultValues.captionHeader,
        nodePxSize: 7,
        nodePxBorder: 2,
        linePxThickness: 3
    }
    public static objectStack: Array<GraphView> = [];

    private componentObj!: HTMLElement;
    private nodeOptionsObj!: HTMLDivElement;

    private canvasObj!: HTMLCanvasElement;
    private canvasContext!: CanvasRenderingContext2D;

    private componentRef: React.RefObject<HTMLDivElement>;
    private canvasRef: React.RefObject<HTMLCanvasElement>;
    private nodeOptionsRef: React.RefObject<HTMLDivElement>;
    
    private data: GraphViewData;
    private currentUnnamedObjectNum!: number;
    private currentArrNodes: Array<Node>;
    private currentArrLinks: Array<Link>;

    constructor(properites: Props) {
        super(properites);
        
        this.data = {
            canvas: {
                mouseData: {
                    lastPosX: 0,
                    lastPosY: 0
                }
            }
        };

        this.state = {
            container: {
                width: properites.viewWidthPx,
                height: properites.viewHeightPx,
            },
            canvas: { 
                selfData: {
                    width: properites.viewWidthPx,
                    height: properites.viewHeightPx,
                    offsetX: 0,
                    offsetY: 0
                },
                nodeData: {
                    selectedNode: null,
                    selectedId: -1,
                    isDrag: false
                },
            },
            showComponent: true
        };

        this.componentRef = React.createRef();
        this.canvasRef = React.createRef();
        this.nodeOptionsRef = React.createRef();

        this.currentArrNodes = this.props.model.getNodes();
        this.currentArrLinks = this.props.model.getLinks();
        
        if(this.props.captionHeader === GraphViewConfig.defaultValues.captionHeader) {
            this.currentUnnamedObjectNum = ++GraphView.objectUnnamedCounter;
            console.log("Caption undefined", GraphView.objectUnnamedCounter);
        }
        console.log(this.props.captionHeader, GraphView.objectUnnamedCounter);

        this.handlerCanvasOnMouseDown.bind(this);
        this.handlerCanvasOnMouseUp.bind(this);
        this.handlerCanvasOnMouseOut.bind(this);
        this.handlerCanvasOnMouseMove.bind(this);
        this.handlerResize.bind(this);
        this.handlerScroll.bind(this);
    }

    private isNodeCatched(clientX: number, clientY: number, node: Node): boolean {

        let nodeLeft: number = node.pos[0] - this.props.nodePxSize!,
            nodeTop: number = node.pos[1] - this.props.nodePxSize!,
            nodeRight: number = node.pos[0] + this.props.nodePxSize! * 2,
            nodeBottom: number = node.pos[1] + this.props.nodePxSize! * 2;

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
                this.data = {
                    canvas: {
                        mouseData: {
                            lastPosX: this.currentArrNodes[i].pos[0], 
                            lastPosY: this.currentArrNodes[i].pos[1]
                        }
                    }
                };

                /// Обновление canvas через callback, поскольку иначе выделение узлов происходит некорректно
                this.setState(prevState => ({
                    ...prevState,
                    canvas: {
                        ...prevState.canvas,
                        nodeData: {
                            selectedNode: this.currentArrNodes[i],
                            selectedId: i, 
                            isDrag: true
                        }, 
                    }
                }), () => this.updateModel());

                return;
            }
        }

        /// Тоже самое, но со снятием выделения
        this.setState(prevState => ({
            ...prevState,
            canvas: {
                ...prevState.canvas,
                nodeData: {
                    selectedNode: null,
                    selectedId: -1, 
                    isDrag: false
                }
            }
        }), () => this.updateModel());  
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
        this.props.model.setNode(this.currentArrNodes[this.state.canvas.nodeData.selectedId], this.state.canvas.nodeData.selectedId);

        this.updateModel();
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
        this.props.model.setNode(this.currentArrNodes[this.state.canvas.nodeData.selectedId], this.state.canvas.nodeData.selectedId);

        this.updateModel();
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
        this.updateModel();
    }

    private handlerAddLink() {
        let inputNodeLinksFromObj: HTMLInputElement = this.nodeOptionsObj.querySelector(`#${GraphViewConfig.fieldsAttrIds.nodeLinksFrom}`)!;
        let inputNodeLinksToObj: HTMLInputElement = this.nodeOptionsObj.querySelector(`#${GraphViewConfig.fieldsAttrIds.nodeLinksTo}`)!;
        let fromValue: number = parseInt(inputNodeLinksFromObj.value),
            toValue: number = parseInt(inputNodeLinksToObj.value);
        console.log(inputNodeLinksFromObj.value, inputNodeLinksToObj.value)
        let newLink: Link = {from: fromValue, to: toValue};
        if(!inputNodeLinksFromObj.validity.valid ||
           !inputNodeLinksToObj.validity.valid) {
            alert("Введены неверные значения");
            return;
        }
        if (this.props.model.addLink(newLink) < 0) {
            alert("Такая связь существует, или её невозможно установить!");
           return;
        }
        inputNodeLinksFromObj.value = "";
        inputNodeLinksToObj.value = "";
        this.updateModel();
    }

    private handlerRemoveLink(index: number) {
        let inputNodeLinksObj: HTMLTableElement = this.nodeOptionsObj.querySelector(`#${GraphViewConfig.fieldsAttrIds.nodeLinks}`)!;
        const removeTableRow = inputNodeLinksObj.rows[index];
        if(this.props.model.removeLink(index)) {
            removeTableRow?.remove();
        }
        this.updateModel();
    }

    private handlerAddNode() {
        let newNode: Node = {
            label: "",
            pos: [this.state.canvas.selfData.width / 2, this.state.canvas.selfData.height / 2],
            color: ""
        };
        this.setState(prevState =>({
            ...prevState,
            canvas: {
                ...prevState.canvas,
                nodeData: {
                    ...prevState.canvas.nodeData,
                    selectedId: this.props.model.addNode(newNode)
                }
            }
        }), () => {
            if(this.state.canvas.nodeData.selectedId  < 0) {
                alert("Ошибка добавления узла");
            }
            this.updateModel();
        });
    }

    private handlerRemoveNode() {
        this.props.model.removeNode(this.state.canvas.nodeData.selectedId);
        this.setState(prevState =>({
            ...prevState,
            canvas: {
                ...prevState.canvas,
                nodeData: {
                    ...prevState.canvas.nodeData,
                    selectedId: -1
                }
            }
        }), () => this.updateModel());
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
                    width: this.canvasObj.offsetWidth, 
                    height: this.canvasObj.offsetHeight,
                    offsetX: canvasOffsetX,
                    offsetY: canvasOffsetY
                }
            }
        }), () => this.updateModel());
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
        }), () => this.updateModel());
    }

    private drawNode(node: Node, isSelected: boolean = false) {
        // отрисовка границ узла
        this.canvasContext.fillStyle = node.color;
        this.canvasContext.fillRect(
            node.pos[0] - this.props.nodePxSize! - this.props.nodePxBorder! * 2, 
            node.pos[1] - this.props.nodePxSize! - this.props.nodePxBorder! * 2, 
            this.props.nodePxSize! * 2 + this.props.nodePxBorder! * 2, 
            this.props.nodePxSize! * 2 + this.props.nodePxBorder! * 2);
        // если узел выделен то граница "белая", иначе "угольная"
        this.canvasContext.fillStyle = isSelected ? "#FFFFFF" : "#333333";
        this.canvasContext.fillRect(
            node.pos[0] - this.props.nodePxSize! - this.props.nodePxBorder!, 
            node.pos[1] - this.props.nodePxSize! - this.props.nodePxBorder!, 
            this.props.nodePxSize! * 2 + this.props.nodePxBorder! - this.props.nodePxBorder!, 
            this.props.nodePxSize! * 2 + this.props.nodePxBorder! - this.props.nodePxBorder!);

        // отрисовка тела узла (квадрат)
        this.canvasContext.fillStyle = node.color;
        this.canvasContext.fillRect(
            node.pos[0] - this.props.nodePxSize!, 
            node.pos[1] - this.props.nodePxSize!, 
            this.props.nodePxSize! * 2 - this.props.nodePxBorder! * 2, 
            this.props.nodePxSize! * 2 - this.props.nodePxBorder! * 2);
        
        // Описание узла
        this.canvasContext.font = `${this.props.nodePxSize!}pt Verdana`;
        this.canvasContext.textAlign = "center";
        this.canvasContext.fillText(node.label, node.pos[0], node.pos[1] + this.props.nodePxSize! * 2.5);
    }

    private drawLink(nodeFrom: Node, nodeTo: Node) {
        this.canvasContext.lineWidth = this.props.linePxThickness!;
        this.canvasContext.beginPath();
        this.canvasContext.moveTo(nodeFrom.pos[0], nodeFrom.pos[1]);
        this.canvasContext.lineTo(nodeTo.pos[0], nodeTo.pos[1]);
        this.canvasContext.strokeStyle = nodeFrom.color;
        this.canvasContext.stroke();
        this.canvasContext.closePath();
    }

    private updateModel() {
        for(let i = 0; i < GraphView.objectStack.length; ++i) {
            if(GraphView.objectStack[i].props.model === this.props.model) {
                GraphView.objectStack[i].update();
            }
        }
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
        if(this.componentObj.parentElement) {
            this.componentObj.parentElement.removeEventListener("scroll", () => this.handlerScroll());
        }

        GraphView.objectStack.splice(GraphView.objectStack.indexOf(this), 1);
    }

    public componentDidMount() {
        if (this.canvasRef.current !== null) {
            const tempCanvasElement = this.canvasRef.current;
            this.canvasObj = tempCanvasElement;

            window.addEventListener("resize", () => this.handlerResize());
            window.addEventListener("scroll", () => this.handlerScroll());
            this.canvasObj.addEventListener("scroll", () => this.handlerScroll());
            if(this.componentRef.current) {
                const tempParent = this.componentRef.current;
                this.componentObj = tempParent;
                if(this.componentObj.parentElement) {
                    this.componentObj.parentElement.addEventListener("scroll", () => this.handlerScroll());
                }
            }

            const tempContext = this.canvasRef.current.getContext("2d");
            if(tempContext !== null) {
                this.canvasContext = tempContext;
                this.update();
            }
        }

        if (this.nodeOptionsRef.current !== null) {
            const tempNodeOptions = this.nodeOptionsRef.current;
            this.nodeOptionsObj = tempNodeOptions;
        } 

        GraphView.objectStack.push(this);

        // Установка размера контейнера, с учётом указаных viewHeightPx и viewWidthPx для canvas
        const nodeOptionsObjStyles = window.getComputedStyle(this.nodeOptionsObj);
        const containerObjStyles = window.getComputedStyle(this.componentObj);
        const canvasObjStyles = window.getComputedStyle(this.canvasObj);
        let incWidthByMaxWidth: number = getStylePropNumberValue(nodeOptionsObjStyles, "max-width"),
            incWidthByBorder: number = getStylePropNumberValue(containerObjStyles, "border-right"),
            incHeightByMarginTop: number = getStylePropNumberValue(canvasObjStyles, "margin-top");

        this.setState(prevState => ({
            ...prevState,
            container: {
                height: prevState.container.height + incHeightByMarginTop,
                width: prevState.container.width + incWidthByMaxWidth + incWidthByBorder
            },
        }), () => this.handlerResize());
    }

    public shouldComponentUpdate(){
        return true;
    }

    public render() {
        return (
            this.state.showComponent && 
            <div 
                className="graph-view-container" 
                ref={ this.componentRef } 
                style={{
                    width: `${this.state.container.width}px`, 
                    height: `${this.state.container.height}px`
                }}
            >
                <div className="graph-view-caption">
                    { this.props.captionHeader !== GraphViewConfig.defaultValues.captionHeader ? this.props.captionHeader : `${this.props.captionHeader}_${this.currentUnnamedObjectNum}` }
                </div>
                <input type="button" id="graph-view-close" value="X" onClick={ () => this.handlerHideGraphView() }/>
                <canvas 
                    ref={ this.canvasRef }
                    width={ this.state.canvas.selfData.width } 
                    height={ this.state.canvas.selfData.height }
                    onMouseDown={ (evt) => this.handlerCanvasOnMouseDown(evt) }
                    onMouseUp={ (evt) => this.handlerCanvasOnMouseUp(evt) }
                    onMouseOut={ (evt) => this.handlerCanvasOnMouseOut(evt) }
                    onMouseMove={ (evt) => this.handlerCanvasOnMouseMove(evt) }    
                />
                <div className="graph-view-control" ref={ this.nodeOptionsRef }>
                    <h4>Добавление узлов</h4>
                    <div className="graph-view-control-row-container">
                        <input 
                            type="button" 
                            value="Добавить" 
                            onClick={() => this.handlerAddNode()}
                        />
                        <input 
                            type="button" 
                            value="Удалить" 
                            onClick={() => this.handlerRemoveNode()}
                        />
                    </div>
                    {   
                        this.state.canvas.nodeData.selectedId >= 0 && 
                        <div className="graph-node-control">
                            <h4>Настройка узла {`[${this.state.canvas.nodeData.selectedId}]:` + this.currentArrNodes[this.state.canvas.nodeData.selectedId].label}</h4>
                            <label htmlFor={GraphViewConfig.fieldsAttrIds.nodeLabel}>Наименование узла:</label>
                            <input 
                                type="text" 
                                placeholder="sample_node_<N>" 
                                id={ GraphViewConfig.fieldsAttrIds.nodeLabel } 
                                value={ this.state.canvas.nodeData.selectedNode!.label }
                                onChange={ (evt) => { 
                                    let newLabel: string = evt.currentTarget.value;
                                    this.setState(prevState => ({
                                        ...prevState,
                                        canvas: {
                                            ...prevState.canvas,
                                            nodeData: {
                                                ...prevState.canvas.nodeData,
                                                selectedNode: {
                                                    ...prevState.canvas.nodeData.selectedNode!,
                                                    label: newLabel
                                                }
                                            }
                                        }
                                    }), () => {
                                        this.props.model.setNode(this.state.canvas.nodeData.selectedNode!,this.state.canvas.nodeData.selectedId);
                                        this.currentArrNodes[this.state.canvas.nodeData.selectedId] = this.state.canvas.nodeData.selectedNode!;
                                        this.updateModel();
                                    });
                                }}
                            />
                            <div className="graph-view-control-row-container">
                                <div>
                                    <label htmlFor={GraphViewConfig.fieldsAttrIds.nodePosX}>X:</label>
                                    <input 
                                        type="text" 
                                        placeholder="X" 
                                        id={ GraphViewConfig.fieldsAttrIds.nodePosX } 
                                        value={ this.state.canvas.nodeData.selectedNode!.pos[0] }
                                        pattern="[0-9]*"
                                        onChange={ (evt) => { 
                                            if (evt.currentTarget.validity.valid) {
                                                let newPosX = parseInt(evt.currentTarget.value);
                                                if (newPosX > this.state.canvas.selfData.width) {
                                                    newPosX = this.state.canvas.selfData.width;
                                                }
                                                this.setState(prevState => ({
                                                    ...prevState,
                                                    canvas: {
                                                        ...prevState.canvas,
                                                        nodeData: {
                                                            ...prevState.canvas.nodeData,
                                                            selectedNode: {
                                                                ...prevState.canvas.nodeData.selectedNode!,
                                                                pos: [newPosX, this.state.canvas.nodeData.selectedNode!.pos[1]]
                                                            }
                                                        }
                                                    }
                                                }), () => {
                                                    this.props.model.setNode(this.state.canvas.nodeData.selectedNode!, this.state.canvas.nodeData.selectedId);
                                                    this.currentArrNodes[this.state.canvas.nodeData.selectedId] = this.state.canvas.nodeData.selectedNode!;
                                                    this.updateModel();
                                                });
                                            }
                                        }}
                                    />
                                </div>
                                <div>
                                    <label htmlFor={GraphViewConfig.fieldsAttrIds.nodePosY}>Y:</label>
                                    <input 
                                        type="text" 
                                        placeholder="Y" 
                                        id={ GraphViewConfig.fieldsAttrIds.nodePosY } 
                                        value={ this.state.canvas.nodeData.selectedNode!.pos[1] }
                                        pattern="[0-9]*"
                                        onChange={ (evt) => { 
                                            if (evt.currentTarget.validity.valid) {
                                                let newPosY = parseInt(evt.currentTarget.value);
                                                if (newPosY > this.state.canvas.selfData.height) {
                                                    newPosY = this.state.canvas.selfData.height;
                                                }
                                                this.setState(prevState => ({
                                                    ...prevState,
                                                    canvas: {
                                                        ...prevState.canvas,
                                                        nodeData: {
                                                            ...prevState.canvas.nodeData,
                                                            selectedNode: {
                                                                ...prevState.canvas.nodeData.selectedNode!,
                                                                pos: [this.state.canvas.nodeData.selectedNode!.pos[0], newPosY]
                                                            }
                                                        }
                                                    }
                                                }), () => {
                                                    this.props.model.setNode(this.state.canvas.nodeData.selectedNode!, this.state.canvas.nodeData.selectedId);
                                                    this.currentArrNodes[this.state.canvas.nodeData.selectedId] = this.state.canvas.nodeData.selectedNode!;
                                                    this.updateModel();
                                                });
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                            <label htmlFor={GraphViewConfig.fieldsAttrIds.nodeColor}>Цвет узла:
                                <span 
                                    style={{
                                        backgroundColor: this.state.canvas.nodeData.selectedNode!.color, 
                                        display: "inline-block", 
                                        width: "10pt", 
                                        height: "10pt"
                                    }}>
                                </span>
                            </label>
                            <input 
                                type="text" placeholder="#??????" 
                                id={ GraphViewConfig.fieldsAttrIds.nodeColor } 
                                value={ this.state.canvas.nodeData.selectedNode!.color }
                                onChange={ (evt) => {
                                    let newColor: string = evt.currentTarget.value;  
                                    this.setState(prevState => ({
                                        ...prevState,
                                        canvas: {
                                            ...prevState.canvas,
                                            nodeData: {
                                                ...prevState.canvas.nodeData,
                                                selectedNode: {
                                                    ...prevState.canvas.nodeData.selectedNode!,
                                                    color: newColor
                                                }
                                            }
                                        }
                                    }), () => {
                                        this.props.model.setNode(this.state.canvas.nodeData.selectedNode!,this.state.canvas.nodeData.selectedId);
                                        this.currentArrNodes[this.state.canvas.nodeData.selectedId] = this.state.canvas.nodeData.selectedNode!;
                                        this.updateModel();
                                    });
                                }}
                            />
                            <label htmlFor={GraphViewConfig.fieldsAttrIds.nodeLinks}>Связи узла:</label>
                            <table id={GraphViewConfig.fieldsAttrIds.nodeLinks}>
                                <tr>
                                    <th>От</th>
                                    <th>До</th>
                                    <th>-</th>
                                </tr>
                                {
                                    this.currentArrLinks.map(
                                        (element,index) => 
                                            element.from === this.state.canvas.nodeData.selectedId || element.to === this.state.canvas.nodeData.selectedId ?
                                                <tr data-index={ index }>
                                                    <td>{ `[${element.from}]:${this.currentArrNodes[element.from].label}` }</td>
                                                    <td>{ `[${element.to}]:${this.currentArrNodes[element.to].label}` }</td>
                                                    <td><input type="button" value="X" onClick={ () => this.handlerRemoveLink(index) }/></td>
                                                </tr> 
                                            : ""
                                        )
                                }
                                <tr>
                                    <td>
                                        <input 
                                            type="text" 
                                            placeholder="ID узла от" 
                                            pattern="[0-9]*"
                                            id={ GraphViewConfig.fieldsAttrIds.nodeLinksFrom }
                                        />
                                    </td>
                                    <td>
                                        <input 
                                            type="text" 
                                            placeholder="ID узла до" 
                                            pattern="[0-9]*"
                                            id={ GraphViewConfig.fieldsAttrIds.nodeLinksTo }
                                        />
                                    </td>
                                    <td>
                                        <input 
                                            type="button" 
                                            id="node-link-add" 
                                            value="Добавить" 
                                            onClick={ () => this.handlerAddLink() }
                                        /></td>
                                </tr>
                            </table>
                        </div>
                    }
                </div>
            </div>
        );
    }
}