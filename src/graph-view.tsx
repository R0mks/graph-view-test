import React from "react";
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
        },
        nodeData: {
            selectedNode: Node | null,
            selectedId: number;
            isDrag: boolean;
        }
    }
}

interface State {
    container: {
        width: number;
        height: number;
    },
    canvas: {
        width: number;
        height: number;
        offsetX: number;
        offsetY: number;
    };
    
    showComponent: boolean;
}

const getStylePropNumberValue = function (objStyle: CSSStyleDeclaration, property: string): number {
    const tempProperty: string = objStyle.getPropertyValue(property).match(/\d+/)![0];
    return tempProperty !== null ? parseInt(tempProperty) : 0;
}

export class GraphView extends React.Component<Props, State> {
    private static objectUnnamedCounter: number = 0;
    private static defaultProps: Partial<Props> = {
        captionHeader:  'GRAPH_VIEW',
        nodePxSize: 7,
        nodePxBorder: 2,
        linePxThickness: 3
    };
    private static objectFocused: GraphView | null = null;
    private static isWindowMouseEvtCatched = false;
    public static objectStack: Array<GraphView> = [];

    private componentObj!: HTMLElement;
    private canvasObj!: HTMLCanvasElement;
    private canvasContext!: CanvasRenderingContext2D;

    private componentRef: React.RefObject<HTMLDivElement>;
    private canvasRef: React.RefObject<HTMLCanvasElement>;
    
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
                },
                nodeData: {
                    selectedNode: null,
                    selectedId: -1,
                    isDrag: false
                }
            }
        };

        this.state = {
            container: {
                width: properites.viewWidthPx,
                height: properites.viewHeightPx,
            },
            canvas: { 
                width: properites.viewWidthPx,
                height: properites.viewHeightPx,
                offsetX: 0,
                offsetY: 0
            },
            showComponent: true
        };

        this.componentRef = React.createRef();
        this.canvasRef = React.createRef();

        this.currentArrNodes = this.props.model.getNodes();
        this.currentArrLinks = this.props.model.getLinks();
        
        if(this.props.captionHeader === GraphView.defaultProps.captionHeader) {
            this.currentUnnamedObjectNum = ++GraphView.objectUnnamedCounter;
        }
        this.handlerCanvasOnMouseDown.bind(this);
        this.handlerResize.bind(this);
        this.handlerScroll.bind(this);
        this.handlerFocuseContainer.bind(this);
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

    private handlerCanvasOnMouseDown(event: React.MouseEvent<HTMLCanvasElement>): void {
        event.preventDefault();
        let clientPosX: number = event.clientX - this.state.canvas.offsetX;
        let clientPosY: number = event.clientY - this.state.canvas.offsetY;
        
        for(let i = 0; i < this.currentArrNodes.length; ++i)
        {
            if(this.isNodeCatched(clientPosX, clientPosY, this.currentArrNodes[i])) {
                this.data = {
                    canvas: {
                        mouseData: {
                            lastPosX: this.currentArrNodes[i].pos[0], 
                            lastPosY: this.currentArrNodes[i].pos[1]
                        },
                        nodeData: {
                            selectedNode: this.currentArrNodes[i],
                            selectedId: i, 
                            isDrag: true
                        }
                    }
                };
                this.updateViews();
                return;
            }
        }

        this.data = {
            canvas: {
                ...this.data.canvas,
                nodeData: {
                    selectedNode: null,
                    selectedId: -1, 
                    isDrag: false
                }

            }
        }
        this.handlerFocuseContainer(event);
        this.updateViews();
    }

    private static handlerCanvasOnMouseUp(event: MouseEvent): void {
        if (GraphView.objectFocused === null) {
            return;
        }
        if(!GraphView.objectFocused.data.canvas.nodeData.isDrag) {
            return;
        }

        event.preventDefault();
        GraphView.objectFocused.data = {
            canvas: {
                ...GraphView.objectFocused.data.canvas,
                nodeData: {
                    ...GraphView.objectFocused.data.canvas.nodeData,
                    isDrag: false
                }
            }
        };
        GraphView.objectFocused.props.model.setNode(GraphView.objectFocused.currentArrNodes[GraphView.objectFocused.data.canvas.nodeData.selectedId], GraphView.objectFocused.data.canvas.nodeData.selectedId);

        GraphView.objectFocused.updateViews();
    }

    private static handlerCanvasOnMouseMove(event: MouseEvent): void {
        if (GraphView.objectFocused === null) {
            return;
        }
        if (!GraphView.objectFocused.data.canvas.nodeData.isDrag) {
            return;
        }
        
        event.preventDefault();
        let clientPosX: number = event.clientX - GraphView.objectFocused.state.canvas.offsetX;
        let clientPosY: number = event.clientY - GraphView.objectFocused.state.canvas.offsetY;

        let deltaX: number = clientPosX - GraphView.objectFocused.data.canvas.mouseData.lastPosX;
        let deltaY: number = clientPosY - GraphView.objectFocused.data.canvas.mouseData.lastPosY;

        GraphView.objectFocused.currentArrNodes[GraphView.objectFocused.data.canvas.nodeData.selectedId].pos[0] += deltaX;
        GraphView.objectFocused.currentArrNodes[GraphView.objectFocused.data.canvas.nodeData.selectedId].pos[1] += deltaY;

        GraphView.objectFocused.data = {
            canvas: {
                ...GraphView.objectFocused.data.canvas,
                mouseData: {
                    lastPosX: GraphView.objectFocused.currentArrNodes[GraphView.objectFocused.data.canvas.nodeData.selectedId].pos[0], 
                    lastPosY: GraphView.objectFocused.currentArrNodes[GraphView.objectFocused.data.canvas.nodeData.selectedId].pos[1]
                }            
            }
        };
        GraphView.objectFocused.updateViews();
    }

    private handlerFocuseContainer(event: React.MouseEvent<HTMLElement>): void {
        event.preventDefault();
        if(event.currentTarget.classList.contains("focused")) {
            return;
        }
        
        for (let i = 0; i < GraphView.objectStack.length; i++) {
            if(GraphView.objectStack[i].componentObj.classList.contains("focused")) {
                GraphView.objectStack[i].data = {
                    canvas: {
                        ...GraphView.objectStack[i].data.canvas,
                        nodeData:{
                            selectedNode: null,
                            isDrag: false,
                            selectedId: -1,
                        }
                    }
                }
                GraphView.objectStack[i].componentObj.classList.remove("focused");
                GraphView.objectStack[i].update();
                break;
            }
        }

        event.currentTarget.classList.add("focused");
        GraphView.objectFocused = this;
    }

    public unfocuseContainer(): void {
        if (GraphView.objectFocused === null) {
            return;
        }
        GraphView.objectFocused.data = {
            canvas: {
                ...GraphView.objectFocused.data.canvas,
                nodeData:{
                    selectedNode: null,
                    isDrag: false,
                    selectedId: -1,
                }
            }
        }
        GraphView.objectFocused.componentObj.classList.remove("focused");
        GraphView.objectFocused.update();
        GraphView.objectFocused = null;
        
    }

    public handlerHideGraphView(event: React.MouseEvent<HTMLElement>): void {
        event.preventDefault();
        this.componentObj.classList.remove("focused");
        this.setState(prevState => ({
            ...prevState,
            showComponent: false
        }), () => {
            for(let i = 0; i < GraphView.objectStack.length; ++i) {
                GraphView.objectStack[i].handlerScroll();
            }
        });
    }

    public handlerResize(): void {
        let canvasOffsetData = this.canvasObj.getBoundingClientRect();
        let canvasOffsetX: number = canvasOffsetData.left;
        let canvasOffsetY: number = canvasOffsetData.top;

        this.setState(prevState => ({
            ...prevState,
            canvas: {
                width: this.canvasObj.offsetWidth, 
                height: this.canvasObj.offsetHeight,
                offsetX: canvasOffsetX,
                offsetY: canvasOffsetY
            }
        }), () => this.updateViews());
    }
    
    public handlerScroll(): void {
        let canvasOffsetData = this.canvasObj.getBoundingClientRect();
        let canvasOffsetX: number = canvasOffsetData.left;
        let canvasOffsetY: number = canvasOffsetData.top;

        this.setState(prevState => ({
            ...prevState,
            canvas: {
                ...prevState.canvas,
                offsetX: canvasOffsetX,
                offsetY: canvasOffsetY
            }
        }), () => this.updateViews());
    }

    private drawNode(node: Node, isSelected: boolean = false): void {
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

    private drawLink(nodeFrom: Node, nodeTo: Node): void {
        this.canvasContext.lineWidth = this.props.linePxThickness!;
        this.canvasContext.beginPath();
        this.canvasContext.moveTo(nodeFrom.pos[0], nodeFrom.pos[1]);
        this.canvasContext.lineTo(nodeTo.pos[0], nodeTo.pos[1]);
        this.canvasContext.strokeStyle = nodeFrom.color;
        this.canvasContext.stroke();
        this.canvasContext.closePath();
    }

    public getNodesArr(): Array<Node> {
        return this.currentArrNodes;
    }
    
    public getLinksArr(): Array<Link> {
        return this.currentArrLinks;
    }

    public getGraphViewData(): GraphViewData {
        return this.data;
    }

    public setGraphViewData(grapViewData: GraphViewData): void {
        this.data = grapViewData;
    }
    
    public getComponentObject(): HTMLElement {
        return this.componentObj;
    }

    public getCaption(): string {
        return this.props.captionHeader! !== GraphView.defaultProps.captionHeader ? this.props.captionHeader! : `${this.props.captionHeader}_${this.currentUnnamedObjectNum}`;
    }

    public updateCurrentArrNode(updatedNode: Node, index: number): void {
        this.props.model.setNode(updatedNode, index);
        this.currentArrNodes[index] = updatedNode;
    }

    public updateCurrentArrLink(linkData: Link, index: number): void {
        this.currentArrLinks[index] = linkData;
    }

    public updateViews(): void {
        for(let i = 0; i < GraphView.objectStack.length; ++i) {
            if(GraphView.objectStack[i].props.model === this.props.model) {
                GraphView.objectStack[i].update();
            }
        }
    }

    public update(): void {
        if (this.canvasContext === null || this.canvasContext === undefined ||
            this.currentArrNodes === null || this.currentArrNodes === undefined) {
            return;
        }

        this.canvasContext.clearRect(0, 0, this.state.canvas.width, this.state.canvas.height);
        if (this.currentArrLinks.length > -1) {
            for (let i = 0; i < this.currentArrLinks.length; ++i) {
                this.drawLink(this.currentArrNodes[this.currentArrLinks[i].from], this.currentArrNodes[this.currentArrLinks[i].to]);
            }
        }

        for (let i = 0; i < this.currentArrNodes.length; ++i) {
            this.drawNode(this.currentArrNodes[i], this.data.canvas.nodeData.selectedId === i ? true : false);
        }
    }

    public componentWillUnmount() {
        window.removeEventListener("resize", () => this.handlerResize());
        window.removeEventListener("scroll", () => this.handlerScroll());
        this.canvasObj.removeEventListener("scroll", () => this.handlerScroll());
        if(this.componentObj.parentElement) {
            this.componentObj.parentElement.removeEventListener("scroll", () => this.handlerScroll());
        }

        if (this === GraphView.objectFocused) {
            this.unfocuseContainer();
        }

        GraphView.objectStack.splice(GraphView.objectStack.indexOf(this), 1);
        if (GraphView.objectStack.length <= 0 && GraphView.isWindowMouseEvtCatched) {
            window.removeEventListener("mouseup", (evt) => GraphView.handlerCanvasOnMouseUp(evt) );
            window.removeEventListener("mousemove", (evt) => GraphView.handlerCanvasOnMouseMove(evt) );
            GraphView.isWindowMouseEvtCatched = false;
        }
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

        GraphView.objectStack.push(this);
        if (GraphView.objectStack.length >= 1 && !GraphView.isWindowMouseEvtCatched) {
            window.addEventListener("mouseup", (evt) => GraphView.handlerCanvasOnMouseUp(evt) );
            window.addEventListener("mousemove", (evt) => GraphView.handlerCanvasOnMouseMove(evt) );
            GraphView.isWindowMouseEvtCatched = true;
        }

        // Установка размера контейнера, с учётом указаных viewHeightPx и viewWidthPx для canvas
        const canvasObjStyles = window.getComputedStyle(this.canvasObj);
        let incHeightByMarginTop: number = getStylePropNumberValue(canvasObjStyles, "margin-top");
        this.setState(prevState => ({
            ...prevState,
            container: {
                ...prevState.container,
                height: prevState.container.height + incHeightByMarginTop,
            },
        }), () => this.handlerResize());
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
                onMouseDown={(evt) => this.handlerFocuseContainer(evt)}
            >
                <div className="graph-view-caption">
                    { this.props.captionHeader !== GraphView.defaultProps.captionHeader ? this.props.captionHeader : `${this.props.captionHeader}_${this.currentUnnamedObjectNum}` }
                </div>
                <input type="button" id="graph-view-close" value="X" onClick={ (evt) => this.handlerHideGraphView(evt) }/>
                <canvas 
                    ref={ this.canvasRef }
                    width={ this.state.canvas.width } 
                    height={ this.state.canvas.height }
                    onMouseDown={ (evt) => this.handlerCanvasOnMouseDown(evt) }
                />
            </div>
        );
    }
}