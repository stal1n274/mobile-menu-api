var MenuModel = require('../../models/menu_model'),
    GridModel = require('../../models/grid_model'),
    CategoryModel = require('../../models/category_model'),
    MenuItemModel = require('../../models/menu_item_model'),
    ExportCsv = require('../../models/export_csv'),
    ImportCsv = require('../../models/import_csv'),
    AccountController = require("./account_controller"),
    Seq = require('seq');

function AccountMenusController(options) {
    AccountMenusController.super_.call(this, options);

    this._fields = ['name'];
}
require("util").inherits(AccountMenusController, AccountController);
module.exports = AccountMenusController;

AccountMenusController.prototype.list = function () {
    var res = this._res;

    var gridModel = new GridModel({
        model: MenuModel,
        conditions: {"account_id": this._account_id},
        sortable_cols: {"name": "name", "created_at": "_id"},
        params: this._req.params
    });
    Seq()
        .par(function () {
            gridModel.count(this);
        })
        .par(function () {
            gridModel.rows(this);
        })
        .seq(function (cnt, rows) {
            res.send({
                total: cnt,
                rows: rows
            });
        }).catch(function (err) {
            res.json({error: err});
        });
};

AccountMenusController.prototype.get = function () {
    MenuModel.findOne({'_id': this._req.params['id']}, null, null, this._getCallback.bind(this));
};

AccountMenusController.prototype.save = function () {
    var self = this,
        params = this._req.params;

    Seq()
        .seq(function () {// find or create Menu
            if (params['id']) {
                MenuModel.findById(params['id'], this)
            } else {
                var menu = new MenuModel({
                    account_id: self._account_id
                });
                this(null, menu);
            }
        })
        .seq(function (menu) { // Validate menu account, fill out values
            if (!menu) {
                return this('menu_not_found');
            }
            if (menu.account_id != self._account_id) {
                return this('invalid_menu');
            }
            self._fields.forEach(function (field) {
                if (params.hasOwnProperty(field)) {
                    menu[field] = params[field];
                }
            });
            menu.save(this);
        })
        .seq(function (menu) {
            self._res.json({
                success: true,
                row: menu
            });
        }).catch(function (err) {
            self.sendError(err);
        });
};

AccountMenusController.prototype.del = function () {
    var self = this,
        ids = this._req.params['id'].split(',');
    Seq(ids)
        .parMap(function (id) {// find by id
            MenuModel.findById(id, this);
        })
        .parEach(function (menu) {// validate account and remove
            if (menu && menu.account_id == self._account_id) {
                menu.remove(this);
            } else {
                this();
            };
        })
        .seq(function () { // send succes message
            self.sendSuccess();
        })
        .catch(function (err) {
            self.sendError(err);
        });
};

AccountMenusController.prototype.before = function (cb) {
    this._user_id = "50cc682c16487d6c0b000004";
    this._account_id = "50cc682c16487d6c0b000003";
    cb();
};

AccountMenusController.prototype.export = function () {
    var self = this,
        id = this._req.params['id'];

    Seq()
        .seq(function () {// find by id
            MenuModel.findById(id, this);
        })
        .seq(function (menu) { // Validate menu account, fill out values
            if (!menu) {
                return this('menu_not_found');
            }
            if (menu.account_id != self._account_id) {
                return this('invalid_menu');
            }
            this(null, menu);
        })
        .par(function (menu) {
            CategoryModel.find({menu_id: menu._id}, this);
        })
        .par(function (menu) {
            MenuItemModel.find({menu_id: menu._id}, this);
        })
        .seq(function (categories, menu_items) {
            var csv = new ExportCsv(categories, menu_items);
            csv.export(function (err, data) {
                self._res.writeHead(200, {
                  'Content-Length': Buffer.byteLength(data),
                  'Content-Type': 'text/plain'
                });
                self._res.write(data);
                self._res.end();
            });
        })
        .catch(function (err) {
            self.sendError(err);
        });
}

AccountMenusController.prototype.import = function () {
    var csv_content = [
        "category,dish_name,description,weight,price,price2,price3,price4",
        "One,,,,Price,,,",
        ",Dish1,dis1 desc,10/20/30,10,,,",
        "Two,,,,,,,",
        "  Three,,,,Price1,Price2,,",
        ",dish2,dish2 desc,30/20/10,10,20,,",
        "    Four,,,,Price Four,,,",
        ",Four dish,four desc,1kg,100,,,"
    ].join("\n");
    var importService = new ImportCsv("123");
    importService.import(csv_content);
    this.sendSuccess();
}