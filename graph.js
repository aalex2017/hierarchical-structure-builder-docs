class Graph {
    element;
    
    _ignoreSorting;
    _ignoreRootSorting;
    
    _expansionButtonTemplate;
    _sortingTemplate;
    _contentTemplate;
    _canvas;
    
    #publicMode;
    #showConnections;
    #contentClickCallback;
    
    #setLineDash;
    #lineWidth;
    #strokeStyle;
    #arcRadius;
    
    static _defaultSortingContentNumber     = '1-2-3';
    static _defaultSortingContentAlphabet   = 'A-B-C';
    
    static #instances       = [];
    static #animationId     = null;
    
    constructor(element, options = {}) {
        const {
            publicMode              ,
            showConnections         ,
            ignoreSorting           ,
            ignoreRootSorting       ,
            contentClickCallback    ,
            setLineDash             ,
            lineWidth               ,
            strokeStyle             ,
            arcRadius
            
        } = options;
        
        this.#publicMode            = typeof publicMode === 'boolean'               ? publicMode            : false;
        this.#showConnections       = typeof showConnections === 'boolean'          ? showConnections       : true;
        this._ignoreSorting         = typeof ignoreSorting === 'boolean'            ? ignoreSorting         : false;
        this._ignoreRootSorting     = typeof ignoreRootSorting === 'boolean'        ? ignoreRootSorting     : false;
        this.#contentClickCallback  = typeof contentClickCallback === 'function'    ? contentClickCallback  : null;
        this.#setLineDash           = Array.isArray(setLineDash)                    ? setLineDash           : [5, 5];
        this.#lineWidth             = Number.isInteger(lineWidth) && lineWidth > 0  ? lineWidth             : 1;
        this.#strokeStyle           = typeof strokeStyle === 'string'               ? strokeStyle           : '#8a2be2';
        this.#arcRadius             = Number.isInteger(arcRadius)                   ? arcRadius             : 10;
        this.element                = element;
        
        
        
        if (this.#publicMode) {
            this._ignoreSorting         = true;
            this._ignoreRootSorting     = true;
        }
        
        if (!this._ignoreSorting || (!this._ignoreRootSorting && !this.element.querySelector(':scope > .graph__sorting'))) {
            this._createSortingTemplate();
        }
        
        if (this._ignoreRootSorting) {
            this.element
            .querySelector(':scope > .graph__sorting')
            ?.remove();
        } else {
            this._createRootSorting();
        }
        
        this._createContentTemplate();
        
        
        const parentsAndVertices    = this.#distributeVerticesByParents();
        const subtrees              = this.#buildSubtrees(parentsAndVertices);
        
        Graph.prototype._checkSiblingError.call(this, this.element);
        
        for (const parent in subtrees) {
            Graph.prototype._checkSiblingError.call(this, subtrees[parent]);
        }
        
        this.#buildGraph(subtrees);
        
        
        if (this.#publicMode) {
            this.element
            .querySelectorAll('.graph__vertex--loop-error')
            .forEach(vertex => {
                const parent    = vertex.parentElement.closest('.graph__vertex');
                const subtree   = parent.querySelector(':scope > .graph__subtree');
                
                vertex.remove();
                
                if (subtree && !subtree.querySelector(':scope > .graph__vertex')) {
                    subtree.remove();
                }
            });
        }
        
        this.#createExpansionButtonTemplate();
        
        const vertices              = this.element.querySelectorAll('.graph__vertex');
        const verticesAndSorting    = {};
        
        vertices.forEach(vertex => {
            vertex.prepend(this._expansionButtonTemplate.cloneNode(true));
            
            const id        = vertex.dataset.id;
            const sorting   = vertex.dataset.sorting || '';
            
            if (id && id in verticesAndSorting) {
                vertex.dataset.sorting = verticesAndSorting[id];
            } else {
                verticesAndSorting[id] = sorting;
            }
            
            this._createContent(vertex);
            this._checkNodeType(vertex);
        });
        
        vertices.forEach(vertex => {
            this.#checkIfHasChild(vertex);
        });
        
        
        this.#createCanvas();
        this.#handleExpansionButtonClick();
        
        if (this.#publicMode || this.#contentClickCallback) {
            this.#handleContentClick();
        }
        
        if (this.#showConnections) {
            Graph.#instances.push(this);
        }
        
        Graph.startRendering();
    }
    
    static startRendering() {
        if (Graph.#animationId) {
            return;
        }
        
        Graph.#renderLoop();
    }
    
    static stopRendering() {
        cancelAnimationFrame(Graph.#animationId);
        
        Graph.#animationId = null;
    }
    
    _createSortingTemplate() {
        this._sortingTemplate               = document.createElement('div');
        this._sortingTemplate.className     = 'graph__sorting';
    }
    
    _createContentTemplate() {
        this._contentTemplate               = document.createElement('div');
        this._contentTemplate.className     = 'graph__content';
        
        if (!this._ignoreSorting) {
            this._contentTemplate.append(this._sortingTemplate.cloneNode(true));
        }
    }
    
    _createRootSorting() {
        let rootSorting = this.element.querySelector(':scope > .graph__sorting');
        
        if (!rootSorting) {
            rootSorting = this._sortingTemplate.cloneNode(true);
            
            this.element.prepend(rootSorting);
            
            this._fillOutSorting(rootSorting, this.element.dataset.rootSorting);
        }
        
        rootSorting.classList.add('graph__sorting--root');
    }
    
    _createContent(vertex) {
        const expansionButton   = vertex.querySelector(':scope > .graph__expansion-button');
        let content             = vertex.querySelector(':scope > .graph__content');
        let sorting             = content?.querySelector(':scope .graph__sorting');
        
        if (!content) {
            content                 = this._contentTemplate.cloneNode(true);
            content.textContent     = vertex.dataset.id || '';
            
            expansionButton.insertAdjacentElement('afterEnd', content);
        }
        
        if (this._ignoreSorting) {
            sorting?.remove();
            
            return;
            
        } else if (!sorting) {
            sorting = this._sortingTemplate.cloneNode(true);
            
            content.append(sorting);
            
            this._fillOutSorting(sorting, vertex.dataset.sorting);
        }
    }
    
    _fillOutSorting(sorting, sortingValue) {
        const value = sortingValue?.trim();
        
        if (value) {
            const name      = document.createElement('span');
            name.className  = 'graph__sorting-name';
            
            if (value === 'number') {
                name.textContent = Graph._defaultSortingContentNumber;
                
            } else if (value === 'alphabet') {
                name.textContent = Graph._defaultSortingContentAlphabet;
                
            }
            
            sorting.append(name);
        }
    }
    
    _getIntersection(vertex) {
        let parent      = vertex;
        const parents   = new Set([vertex.dataset.id]);
        
        while (parent = parent.parentElement?.closest('.graph__vertex')) {
            parents.add(parent.dataset.id);
        }
        
        const children          = new Set();
        const childrenElements  = vertex.querySelectorAll(':scope > .graph__subtree > .graph__vertex');
        
        childrenElements.forEach(child => {
            children.add(child.dataset.id);
        });
        
        return [...children].filter(x => parents.has(x));
    }
    
    _checkNodeType(vertex) {
        const nodeType          = vertex.dataset.nodeType;
        
        const expansionButton   = vertex.querySelector(':scope > .graph__expansion-button');
        const sorting           = vertex.querySelector(':scope > .graph__content .graph__sorting');
        
        if (!this.#publicMode) {
            expansionButton.classList.remove('graph__expansion-button--hidden');
        }
        
        sorting?.classList.remove('graph__sorting--hidden');
        
        if (nodeType === 'error' && !this.#publicMode) {
            vertex.classList.add('graph__vertex--no-item-error');
        }
        
        if (nodeType === 'leaf') {
            vertex.classList.add('graph__vertex--leaf');
            
            if (vertex.querySelector(':scope > .graph__subtree') && !this.#publicMode) {
                vertex.classList.add('graph__vertex--leaf-warning');
                
            } else {
                expansionButton.classList.add('graph__expansion-button--hidden');
                sorting?.classList.add('graph__sorting--hidden');
            }
        }
    }
    
    _handleLoopError(intersection, id, subtrees, graph) {
        for (const intersectiontId of intersection) {
            subtrees
            ?.[id]
            ?.querySelector(`:scope > .graph__vertex[data-id="${intersectiontId}"]`)
            ?.classList.add('graph__vertex--loop-error');
            
            graph
            .querySelectorAll(`.graph__vertex[data-id="${id}"]`)
            .forEach(vertex => {
                const childVertex = vertex.querySelector(`:scope > .graph__subtree > .graph__vertex[data-id="${intersectiontId}"]`);
                
                childVertex?.classList.add('graph__vertex--loop-error');
                
                childVertex
                ?.querySelector(':scope > .graph__subtree')
                ?.remove();
            });
        }
    }
    
    _checkSiblingError(subtree) {
        const siblings = subtree.querySelectorAll(':scope > .graph__vertex');
        
        const values        = new Set();
        const duplicates    = [];
        
        siblings.forEach(vertex => {
            const id = vertex.dataset.id;
            
            if (values.has(id)) {
                duplicates.push(vertex);
            }
            
            values.add(id);
        });
        
        for (const vertex of duplicates) {
            vertex.remove();
        }
    }
    
    _render(dpr) {
        this.#resizeCanvas(dpr);
        
        const ctx = this._canvas.getContext('2d');
        
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        const verticesCoordinates   = this.#getLayout();
        const edges                 = this.#buildEdges(verticesCoordinates);
        
        this.#drawEdges(dpr, ctx, edges);
    }
    
    #createExpansionButtonTemplate() {
        const expansionButton = this.element.querySelector(':scope > .graph__expansion-button');
        
        if (expansionButton) {
            this._expansionButtonTemplate = expansionButton.cloneNode(true);
            
            expansionButton.remove();
            
            return;
        }
        
        this._expansionButtonTemplate               = document.createElement('button');
        this._expansionButtonTemplate.className     = 'graph__expansion-button';
        this._expansionButtonTemplate.type          = 'button';
        
        if (this.#publicMode) {
            this._expansionButtonTemplate.classList.add('graph__expansion-button--hidden');
        }
    }
    
    #handleExpansionButtonClick() {
        this.element.addEventListener('click', event => {
            const button = event.target.closest('.graph__expansion-button');
            
            if (!button || this.#publicMode) {
                return;
            }
            
            button.classList.toggle('graph__expansion-button--expanded');
            
            button
            .closest('.graph__vertex')
            .querySelector(':scope > .graph__subtree')
            ?.classList.toggle('graph__subtree--collapsed');
        });
    }
    
    #handleContentClick() {
        this.element.addEventListener('click', event => {
            const content = event.target.closest('.graph__content');
            
            if (!content) {
                return;
            }
            
            if (this.#publicMode || this.#contentClickCallback) {
                event.preventDefault();
            }
            
            if (this.#publicMode) {
                content
                .closest('.graph__vertex')
                .querySelector(':scope > .graph__subtree')
                ?.classList.toggle('graph__subtree--collapsed');
            }
            
            if (this.#contentClickCallback) {
                const vertex = content.closest('.graph__vertex');
                
                this.#contentClickCallback(vertex.dataset.id);
            }
        });
    }
    
    #checkIfHasChild(vertex) {
        const subtree = vertex.querySelector(':scope > .graph__subtree');
        
        if (subtree) {
            vertex.classList.add('graph__vertex--has-subtree');
        }
        
        if (subtree && subtree.querySelector('.graph__vertex--leaf')) {
            vertex.classList.add('graph__vertex--has-leaf');
        }
    }
    
    #distributeVerticesByParents() {
        const parentsAndVertices = {};
        
        this.element.querySelectorAll('.graph__vertex').forEach(vertex => {
            const id = (vertex.dataset.id ?? '').trim();
            
            if (id === '') {
                return;
            }
            
            const parent = (vertex.dataset.parent ?? '').trim();
            
            vertex.dataset.id       = id;
            vertex.dataset.parent   = parent;
            
            const nodeType          = vertex.dataset.nodeType?.trim();
            
            if (!['error', 'leaf'].includes(nodeType)) {
                delete vertex.dataset.nodeType;
            }
            
            if (!Array.isArray(parentsAndVertices[parent])) {
                parentsAndVertices[parent] = [];
            }
            
            parentsAndVertices[parent].push(vertex);
        });
        
        return parentsAndVertices;
    }

    #buildSubtrees(parentsAndVertices) {
        const subtrees = {};
        
        Object.entries(parentsAndVertices).forEach(([parent, vertices]) => {
            if (parent === '') {
                return;
            }
            
            const subtreeElement       = document.createElement('div');
            subtreeElement.className   = 'graph__subtree graph__subtree--collapsed';
            
            for (const vertex of vertices) {
                subtreeElement.append(vertex);
            }
            
            subtrees[parent] = subtreeElement;
        });
        
        return subtrees;
    }
    
    #buildGraph(subtrees) {
        let path = ':scope > .graph__vertex';
        
        while (true) {
            const vertices = this.element.querySelectorAll(path);
            
            if (vertices.length === 0) {
                break;
            }
            
            vertices.forEach(vertex => {
                if (vertex.querySelector(':scope > .graph__subtree') || vertex.closest('.graph__vertex--loop-error')) {
                    return;
                }
                
                const id = vertex.dataset.id;
                
                if (!(id in subtrees)) {
                    return;
                }
                
                vertex.append(subtrees[id].cloneNode(true));
                
                this.#checkLoopError(vertex, id, subtrees);
            });
            
            path += ' > .graph__subtree > .graph__vertex';
        }
    }
    
    #checkLoopError(vertex, id, subtrees) {
        const intersection = this._getIntersection(vertex);
        
        if (intersection.length > 0) {
            this._handleLoopError(intersection, id, subtrees, this.element);
        }
    }
    
    #getLayout() {
        const vertices      = this.element.querySelectorAll('.graph__vertex');
        const canvasRect    = this._canvas.getBoundingClientRect();
        
        const verticesCoordinates = new Map();
        
        vertices.forEach(vertex => {
            if (vertex.closest('.graph__subtree--collapsed')) {
                return;
            }
            
            if (vertex.dataset.parent === '' && (!vertex.querySelector(':scope > .graph__subtree') || vertex.querySelector(':scope > .graph__subtree--collapsed'))) {
                return;
            }
            
            const expansionButton   = vertex.querySelector(':scope > .graph__expansion-button');
            const contentRect       = vertex.querySelector(':scope > .graph__content').getBoundingClientRect();
            let coordinates;
            
            if (expansionButton.classList.contains('graph__expansion-button--hidden')) {
                coordinates = {
                    x: Math.round(contentRect.left - canvasRect.left),
                    y: Math.round((contentRect.top + contentRect.height / 2) - canvasRect.top),
                    expansionButtonHalfWidth: 0,
                    expansionButtonHalfHeight: 0,
                    vertexHalfHeight: contentRect.height / 2
                };
                
            } else {
                const rect = expansionButton.getBoundingClientRect();
                
                coordinates = {
                    x: Math.round((rect.left + rect.width / 2) - canvasRect.left),
                    y: Math.round((rect.top + rect.height / 2) - canvasRect.top),
                    expansionButtonHalfWidth: Math.round(rect.width / 2),
                    expansionButtonHalfHeight: Math.round(rect.height / 2),
                    vertexHalfHeight: contentRect.height / 2
                };
            }
            
            verticesCoordinates.set(vertex, coordinates);
        });
        
        return verticesCoordinates;
    }

    #buildEdges(verticesCoordinates) {
        const edges = new Map();
        
        for (const [key, value] of verticesCoordinates) {
            if (key.querySelector(':scope > .graph__subtree--collapsed')) {
                continue;
            }
            
            const children = key.querySelectorAll(':scope > .graph__subtree > .graph__vertex');
            
            if (children.length === 0) {
                continue;
            }
            
            const childrenEdges = [];
            
            children.forEach(child => {
                const edge = {
                    from: value,
                    to: verticesCoordinates.get(child)
                };
            
                childrenEdges.push(edge);
            });
            
            edges.set(key, childrenEdges);
        }
        
        return edges;
    }

    #drawEdges(dpr, ctx, edges) {
        ctx.save();
        
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        
        ctx.beginPath();
        
        ctx.setLineDash(this.#setLineDash);
        
        ctx.lineWidth       = this.#lineWidth;
        ctx.strokeStyle     = this.#strokeStyle;
        
        for (const [parent, childrenEdges] of edges) {
            let maxY = 0;
            
            if (this.#arcRadius) {
                for (const edge of childrenEdges) {
                    if ((this.#arcRadius > (edge.to.x - edge.from.x - edge.to.expansionButtonHalfWidth)) || (this.#arcRadius > edge.to.vertexHalfHeight)) {
                        
                        this.#arcRadius = 0;
                        
                        break;
                    }
                }
            }
            
            if (this.#arcRadius) {
                for (const edge of childrenEdges) {
                    const x = edge.from.x + this.#arcRadius + 0.5;
                    const y = edge.to.y - this.#arcRadius + 0.5;
                    
                    ctx.moveTo(x - this.#arcRadius, y);
                    
                    ctx.arc(x, y, this.#arcRadius, Math.PI, (Math.PI / 2), true);
                }
            }
            
            for (const edge of childrenEdges) {
                ctx.moveTo(edge.from.x + this.#arcRadius + 0.5, edge.to.y + 0.5);
                ctx.lineTo(edge.to.x - edge.to.expansionButtonHalfWidth + 0.5 - 2, edge.to.y + 0.5);
                
                if (edge.to.y > maxY) {
                    maxY = edge.to.y;
                }
            }
            
            let minY = childrenEdges[0].from.expansionButtonHalfHeight;
            
            if (this.#publicMode) {
                minY += childrenEdges[0].from.vertexHalfHeight;
            }
            
            maxY -= this.#arcRadius;
            
            ctx.moveTo(childrenEdges[0].from.x + 0.5, maxY + 0.5);
            ctx.lineTo(childrenEdges[0].from.x + 0.5, childrenEdges[0].from.y + minY + 0.5 + 2);
        }
        
        ctx.stroke();
        
        ctx.restore();
    }
    
    #createCanvas() {
        this._canvas            = document.createElement('canvas');
        this._canvas.className  = 'graph__edges';
        
        this.element.prepend(this._canvas);
    }
    
    #resizeCanvas(dpr) {
        const rect              = this.element.getBoundingClientRect();
        
        this._canvas.width      = rect.width    * dpr;
        this._canvas.height     = rect.height   * dpr;
    }
    
    static #renderLoop() {
        const dpr = window.devicePixelRatio || 1;
        
        for (const graph of Graph.#instances) {
            graph._render(dpr);
        }
        
        Graph.#animationId = requestAnimationFrame(Graph.#renderLoop);
    }
}