function GridModel (options) {
    this._options = options;
    this._model = this._options.model;
    this._conditions = this._options.conditions || {};
    
    this.DEFAULT_LIMIT = 10;
    this.MAX_LIMIT = 100;
    this.DEFAULT_PAGE = 1;
}

GridModel.prototype = {
    setCondition : function (field, condition) {
        this._conditions[field] = condition;
    },

    rows : function (cb) {
        var sortable_cols = this._options['sortable_cols'] || {},
            params = this._options['params'] || {},
            directions = {'ASC': "", 'DESC': "-"};
        
        var select = this._model.find(this._conditions);

        /* limit & offset */
        var limit = params['limit'] ? parseInt(params['limit'], 10) : this.DEFAULT_LIMIT;
        limit = Math.min(limit, this.MAX_LIMIT);
        var page = params['page'] ? parseInt(params['page'], 10) : this.DEFAULT_PAGE;
        var offset = (page - 1) * limit;
        select.limit(limit).skip(offset);

        /* sorting */
        if (params.hasOwnProperty('sort')) {
            var sort = JSON.parse(params['sort']);
            if (sort.constructor == Array) {
                sort = sort[0];
            }

            var sort_field = "",
                sort_direction = "";
            if (sortable_cols.hasOwnProperty(sort['property'])) {
                sort_field = sortable_cols[sort['property']];
            }
            if (sort['direction'] && directions.hasOwnProperty(sort['direction'])) {
                sort_direction = directions[sort['direction']];
            }
            if (sort_field != "") {
                select.sort(sort_direction + sort_field);
            }
        }
        select.exec(cb);
    },

    count : function (cb) {
        console.log(this._conditions);
        this._model.count(this._conditions, cb);
    }
}

module.exports = GridModel;