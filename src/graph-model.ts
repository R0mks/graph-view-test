export interface Node {
    label: string;
    pos: Array<number>;
    color: string;
}

export interface Link {
    from: number;
    to: number;
}

export class GraphModel {
    private static defaultNode: Node = {
        label: "sample_node",
        pos: [0, 0],
        color: "#000000"
    }
    /// HEX code pattern
    private static colorRegex: RegExp = /#[a-f\d]{3}(?:[a-f\d]?|(?:[a-f\d]{3}(?:[a-f\d]{2})?)?)\b/i;

    private nodeLabelEmptyCounter: number;
    private arrNode: Array<Node>;
    private arrLinks: Array<Link>;

    constructor(nodes: Array<Node> = [], links: Array<Link> = []) {
        this.nodeLabelEmptyCounter = 0;
        this.arrNode = [];
        this.arrLinks = [];
        this.setNodesAndLinks(nodes, links);
    }

    public getLinks(): Array<Link> {
        return this.arrLinks;
    };

    public getNodes(): Array<Node> {
        return this.arrNode;
    };

    public setNodesAndLinks(nodes: Array<Node>, links: Array<Link>) {
        if (nodes != null) {
            for (let i = 0; i < nodes.length; ++i) {
                nodes[i] = this.nodeCorrect(nodes[i]);
            }
        }
        this.arrNode = nodes;

        if(links != null && nodes != null) {
            for (let i = 0; i < links.length; ++i) {
                if(!this.isLinkCorrect(links[i])) {
                   links.splice(i, 1);
                }
            }
        }
        this.arrLinks = links;
    };

    public addNode(newNode : Node): number {
        newNode = this.nodeCorrect(newNode);
        return this.arrNode.push(newNode) -1;
    }
    
    public removeNode(key: number): boolean {
        if(key > this.arrNode.length - 1 || key < 0){
            return false;
        }
        this.arrNode.splice(key, 1);
        for(let i = 0; i < this.arrLinks.length; ++i) {
            if(this.arrLinks[i].from === key ||
               this.arrLinks[i].to === key)
               {
                   this.arrLinks.splice(i, 1);
               }
        }
        return true;
    }

    public addLink(newLink : Link): number {
        if (this.isLinkCorrect(newLink)) {
            return this.arrLinks.push(newLink) - 1;
        }
        return -1;
    }
    
    public removeLink(key: number): boolean {
        if (key > this.arrLinks.length - 1 || key < 0) {
            return false;
        }
        this.arrLinks.splice(key, 1);
        return true;
    }
    
    public setNode(node: Node, index: number): boolean {
        if (!this.arrNode.length ||
            index > this.arrNode.length ||
            index < 0) {
            return false;
        }

        let tempNode = this.nodeCorrect(node);
        this.arrNode[index] = tempNode;
        return true;
    }

    public setLink(link: Link, index: number): boolean {
        if (!this.isLinkCorrect(link) ||
            !this.arrLinks.length ||
            index > this.arrLinks.length ||
            index < 0 ) {
            return false;
        }

        this.arrLinks[index] = link;
        return true;
    }

    private nodeCorrect(node: Node): Node {
        if(node.label.length <= 0) {
            // "sample_node_<N>"
            node.label = `${GraphModel.defaultNode.label}_${this.nodeLabelEmptyCounter}`;
            this.nodeLabelEmptyCounter += 1;
        }
        
        if(node.pos.length < 2) {
            node.pos = GraphModel.defaultNode.pos;
        }
        
        if(!GraphModel.colorRegex.test(node.color)) {
            node.color = GraphModel.defaultNode.color;
        }

        return node;
    }

    private isLinkExist(link: Link): boolean {
        let reverseLink: Link = {from: link.to , to: link.from};
        let existsSameLinkCount: number = 
            this.arrLinks.filter(linkElement => linkElement === link || linkElement === reverseLink).length;
        
        if (existsSameLinkCount > 0) {
            return true;
        }
        return false;
    }

    private isLinkCorrect(link: Link): boolean {
        if (link.from === link.to) {
            return false;
        }
        if (this.arrNode === null ||
            this.arrNode.length <= 0 ||
            link.from > this.arrNode.length - 1 || 
            link.to > this.arrNode.length - 1) {
            return false;
        }
        if (this.isLinkExist(link)) {
            return false;
        }
        return true;
    }
}