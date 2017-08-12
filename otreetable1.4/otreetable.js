/*
	oTreeTable 1.4
	Author: 青梅煮酒 85079542 oukunqing@126.com
	Update: 2015-10-23
*/
var _otree_table = _otree_table || {};
_otree_table.getMyName = function(){ 
	var es = document.getElementsByTagName('script'); 
	var src = es[es.length -1].src; 
	return src.split('/')[src.split('/').length-1].split('?')[0];
};
_otree_table.getJsPath = function(js, path){
	var es = document.getElementsByTagName('script'); 
	for (var i = 0,c = es.length; i < c; i++) {
		var si = es[i].src.lastIndexOf('/');
		if(es[i].src != '' && es[i].src.substr(si + 1).split('?')[0] == js){
			return es[i].src.substring(0, si + 1).replace(path, '');
		}
	}
};
_otree_table.loadCss = function(cssDir, cssName){
	var tag = document.createElement('link');
	tag.setAttribute('rel','stylesheet');
	tag.setAttribute('type','text/css');
	tag.setAttribute('href', cssDir + cssName);
	document.getElementsByTagName('head')[0].appendChild(tag);
};
_otree_table.jsName = _otree_table.getMyName();
_otree_table.pagePath = location.href.substring(0, location.href.lastIndexOf('/')+1);
_otree_table.jsPath = _otree_table.getJsPath(_otree_table.jsName, _otree_table.pagePath);
_otree_table.loadCss(_otree_table.jsPath, 'otreetable.css');
_otree_table.getImagePath = function(replacePath){
	var p = _otree_table.jsPath.replace(replacePath, '');
	if(p.indexOf('http://') == 0){
		p = p.replace('http://', '');
		p = p.substring(p.indexOf('/'));
	}
	return p;
};
var otree_table_st = window.setTimeout;
window.setTimeout = function(fRef, mDelay) {
    if (typeof fRef == 'function') {
        var argu = Array.prototype.slice.call(arguments, 2);
        var f = (function() {
            fRef.apply(null, argu);
        });
        return otree_table_st(f, mDelay);
    }
    return otree_table_st(fRef, mDelay);
};

function oTreeTable(id, tb, _cfg){
	var _ = this;
	if(id == undefined || tb == undefined || tb == null || typeof tb != 'object'){
		return null;
	}
	_.id = id;
	_.tbObj = tb;
	_.completed = false;
	_.arrRow = [];
	_.arrRowData = [];
	_.arrParentChild = [];
	//无效的表格行，原样复制，不参与树形重构
	_.arrInvalidRowData = [];
	//要删除的旧的表格行索引
	_.arrRowIndexDelete = [];
	_.arrLevel = [];
	_.topLevel = 0;
	_.maxLevel = 0;
	
	_cfg = _cfg || {};
	_cfg.rowNumber = _cfg.rowNumber || {};

	_.config = {
		showIcon: _cfg.showIcon || false,
		skin: _cfg.skin || 'default',
		cellIndex: _cfg.cellIndex || 0,
		rowNumber:{
			setRowNumber: _cfg.rowNumber.setRowNumber || false,
			cellIndex: _cfg.rowNumber.cellIndex || 0,
			rowIndex: _cfg.rowNumber.rowIndex || 0
		},
		clickIcon: _cfg.clickIcon || false,
		//默认打开的层级
		openLevel: typeof _cfg.openLevel == 'number' ? _cfg.openLevel : -1
	};
	_.config.iconPath = _cfg.iconPath || (_otree_table.getImagePath(_otree_table.pagePath) + 'imgs/' + _.config.skin + '/');

	_._getTableData(tb);

	window.setTimeout(_._create, 50, _);
}

oTreeTable.prototype._buildPid = function(pid){
	return 'pid_' + pid;
};

oTreeTable.prototype._buildId = function(id){
	return 'id_' + id;
};

oTreeTable.prototype._buildRowId = function(id){
	return this.id + 'tr_' + id;
};

oTreeTable.prototype._buildSwitchId = function(id){
	return this.id + 'tr_a_' + id;
};

oTreeTable.prototype._buildIconId = function(id){
	return this.id + 'tr_i_' + id;
};

oTreeTable.prototype._getRowObj = function(id){
	return document.getElementById(this._buildRowId(id));
};

oTreeTable.prototype._getSwitchObj = function(id){
	return document.getElementById(this._buildSwitchId(id));
};

oTreeTable.prototype._checkHasChild = function(pid){
	var strPid = this._buildPid(pid);
	return this.arrParentChild[strPid] != undefined && this.arrParentChild[strPid].length > 1;
};

oTreeTable.prototype._checkLang = function(lang){
	return typeof lang != 'undefined' && lang != null && lang.indexOf('{') >= 0;
};

//提取Lang中的JSON数据，允许部分格式错误，错得离谱的就不要了
oTreeTable.prototype._distillLangValue = function(lang){
	var arr = lang.match(new RegExp('(\{[^\{](.)+\})'));
	if(arr != null){
		//替换错误的格式（连续两个,的，两个:的）
		var str = arr[0].replace(/[\,]+/g,',').replace(/(\{\,)/g, '{').replace(/(\,\})/g, '}').replace(/[\:]+/g,':').replace(/[：]+/,':');
		try{
			return eval('(' + str + ')');
		} catch(e){
			try{
				//最后多了一个}的，删之
				str = str.substring(0, str.length - 1);
				return eval('(' + str + ')');
			}catch(ee){
				return null;
			}
		}
	}
	return null;
};

oTreeTable.prototype._getTableData = function(tb){
	if(tb == null){
		return false;
	}
	this._fillParentChild('-1', '-1');
	var arr = tb.rows;
	for(var i=0,c=arr.length; i<c; i++){
		//THEAD中的行不参与树形重构；TH不参与树形重构，因为可能是表头行
		//这样做的目的是为了保留表头
		if(arr[i].cells.length > 0 && arr[i].cells[0].tagName == 'TD' && arr[i].parentNode.tagName != 'THEAD'){
			//先取tr中的 lang
			var lang = arr[i].lang;
			if(!this._checkLang(lang)){
				var cl = arr[i].cells.length;
				//tr中找不到lang,再取 第一个 td中的lang
				lang = cl > 0 ? arr[i].cells[0].lang : null;
				if(!this._checkLang(lang)){
					// 第一个 td中找不到lang,再取 第二个 td中的lang
					// 第二个 td中还找不到，就不找了
					lang = cl > 1 ? arr[i].cells[1].lang : null;
				}
			}
			var p = this._checkLang(lang) ? this._distillLangValue(lang) : null;
			if(p != null){
				this._fillRowData(p.id, {id:p.id, pid:p.pid, level:p.level, obj:arr[i], hasChild:false, isExpand:false, isDisplay:true, lang:lang, click:arr[i].onclick, dblclick:arr[i].ondblclick});
				this._fillParentChild(p.pid, p.id);
				this._fillLevel(p.level);
			} else {
				this.arrInvalidRowData.push(arr[i]);
			}
			this.arrRowIndexDelete.push(i);
		}
	}
	this.arrRow = arr;
	delete arr;
};

oTreeTable.prototype._fillRowData = function(id, data){
	var strId = this._buildId(id);
	this.arrRowData[strId] = data;
};

oTreeTable.prototype._getRowData = function(id){
	var strId = this._buildId(id);
	if(this.arrRowData[strId] != undefined){
		return this.arrRowData[strId];
	}
};

oTreeTable.prototype._setRowDisplay = function(id, isDisplay){
	var strId = this._buildId(id);
	this.arrRowData[strId].isDisplay = isDisplay;
};

oTreeTable.prototype._setIcon = function(id, rData){
	var strId = this._buildId(id);
	rData = rData || this._getRowData(id);
	if(rData != undefined){
		var icon = document.getElementById(this._buildIconId(rData.id));
		if(icon != null){
			var path = this._getIconPathName(icon.src);
			icon.src = path.path + (rData.isExpand ? 'folderopen.gif' : 'folder.gif');
		}
	}
};

oTreeTable.prototype._getIconPathName = function(strSrc){
	var pos = strSrc.lastIndexOf('/') + 1;
	var strPath = strSrc.substring(0, pos);
	var strName = strSrc.substring(pos);
	return {path:strPath, name:strName};
};

oTreeTable.prototype._setRowChild = function(id, isHasChild){
	var strId = this._buildId(id);
	this.arrRowData[strId].hasChild = isHasChild;
};

oTreeTable.prototype._setRowExpand = function(id, isExpand){
	var strId = this._buildId(id);
	this.arrRowData[strId].isExpand = isExpand;
};

oTreeTable.prototype._fillParentChild = function(pid, id){
	var strPid = this._buildPid(pid);
	if(this.arrParentChild[strPid] == undefined){
		this.arrParentChild[strPid] = [];
		this.arrParentChild[strPid].push(pid);
	}
	this.arrParentChild[strPid].push(id);
};

oTreeTable.prototype._getParentChild = function(pid){
	var strPid = this._buildPid(pid);
	if(this.arrParentChild[strPid] != undefined){
		return this.arrParentChild[strPid];
	}
	return [];
};

oTreeTable.prototype._fillLevel = function(level){
	if(this.arrLevel['L' + level] == undefined){
		this.arrLevel['L' + level] = {level:level};
	}
};

oTreeTable.prototype._buildSpace = function(level){
	var arr = [];
	for(var i=this.topLevel; i<level; i++){
		arr.push('<img src="' + this.config.iconPath + 'empty.gif" class="otb-icon" style="float:left;margin-top:1px;" />');
	}
	return arr.join('');
};

oTreeTable.prototype._buildSwitch = function(rData, hasChild){
	var arr = [
		(this.config.clickIcon ? '<a onclick="' + this.id + '.toggle(' + rData.id + ');">' : ''),
		'<img id="' + this._buildSwitchId(rData.id) + '"',
		' src="' + this.config.iconPath + (hasChild ? (rData.isExpand ? 'minus.gif' : 'plus.gif') : 'empty.gif') + '"',
		' class="otb-icon" style="float:left;margin-top:1px;"', '/>',
		(this.config.clickIcon ? '</a>' : '')
		];	
	return arr.join('');
};

oTreeTable.prototype._buildIcon = function(row, hasChild){
	if(this.config.showIcon){
		var arr = ['<img id="' + this._buildIconId(row.id) + '"',
			' src="' + this.config.iconPath + (row.isExpand ? 'folderopen.gif' : 'folder.gif') + '"',
			' class="otb-icon" style="float:left;margin-top:1px;"', '/>'];	
		return arr.join('');
	}
	return '';
};

oTreeTable.prototype._create = function(_){
	_ = _ || this;
	//检查每组数据的父级节点是否存在，若不存在，则指定父级
	for(var i in _.arrRowData){
		//如果找不到父级，将父级
		if(!_._checkHasChild(_.arrRowData[i].pid) || _._getRowData(_.arrRowData[i].pid) == null){
			_.arrRowData[i].pid = -1;
		}
	}
	for(var i in _.arrParentChild){
		if(_.arrParentChild[i].length > 1){
			var id = _.arrParentChild[i][0];
			var rData = _._getRowData(id);
			if(rData != undefined){
				_._setRowChild(id, true);
				_._setRowExpand(id, true);
			}
		}
	}
	//查找最小的等级
	var arrLevel = [];
	for(var i in _.arrLevel){
		arrLevel.push(_.arrLevel[i]);
	}
	arrLevel = _.quickSort(arrLevel);
	if(arrLevel.length > 0){
		//确定最小等级
		_.topLevel = arrLevel[0].level;
		//确定最大等级
		_.maxLevel = arrLevel[arrLevel.length-1].level;
	}
	//检查表格数据是否存在上下级关系，存在上下级关系才创建树
	if(_.maxLevel > _.topLevel){
		var obj = _.tbObj;
		obj.style.display = 'none';
		//记录原来的表格行数
		var oldLen = obj.rows.length;
		//创建无效的表格行，原样复制
		_.buildInvalid(_.arrInvalidRowData, obj);
		//创建新的表格行
		_.build(-1, obj, _.arrRowData);
		//删除原来的表格行，删除要从后向前删
		for (var k = _.arrRowIndexDelete.length - 1; k >= 0; k--) {
			obj.deleteRow(_.arrRowIndexDelete[k]);
		}
		obj.style.display = '';
	}
	_.completed = true;

	if(_.config.rowNumber.setRowNumber && _.config.rowNumber.cellIndex >= 0){
		_._setRowNumber(_.tbObj, _.config.rowNumber.cellIndex, _.config.rowNumber.rowIndex);
	}

	if(_.config.openLevel >= 0){
		_.expandLevel(_.config.openLevel);
	}
};

oTreeTable.prototype.buildInvalid = function(arr, obj){
	for(var i in arr){
		var row = obj.insertRow(obj.rows.length);
		row.style.cssText = arr[i].style.cssText;

		for(var j=0,c=arr[i].cells.length; j<c; j++){
			var cell = row.insertCell(j);
			cell.innerHTML = arr[i].cells[j].innerHTML;
			cell.style.cssText = arr[i].cells[j].style.cssText;
		}
	}
};

oTreeTable.prototype.build = function(pid, obj, arr){
	var _ = this;
	for(var i in arr){
		var d = arr[i];
		if(d.pid == pid){
			var row = obj.insertRow(obj.rows.length);
			row.style.cssText = d.obj.style.cssText;
			row.id = this._buildRowId(d.id);
			row.lang = d.lang;
			if(d.click != null){
				row.onclick = d.click;
			}
			if(d.dblclick != null){
				row.ondblclick = d.dblclick;
			}
			var strSpace = this._buildSpace(d.level);
			var hasChild = this._checkHasChild(d.id);
			var strSwitch = this._buildSwitch(d, hasChild);

			for(var j=0,c=d.obj.cells.length; j<c; j++){
				var cell = row.insertCell(j);
				var cellCopy = d.obj.cells[j];
				if(j == _.config.cellIndex){
					if(hasChild){
						if(!_.config.clickIcon){
							cell.onclick = function(){
								_.toggle(this.lang);
							};
						}
					}
					cell.lang = d.id;
					cell.innerHTML = strSpace + strSwitch + _._buildIcon(arr[i]) + '<span style="float:left;cursor:default;">' + cellCopy.innerHTML + '</span>';
				} else {
					cell.innerHTML = cellCopy.innerHTML;
				}
				cell.style.cssText = cellCopy.style.cssText;
				cell.className = cellCopy.className;
				cell.colSpan = cellCopy.colSpan;
			}
			if(hasChild){
				this.build(d.id, obj, arr);
			}
		}
	}
};

oTreeTable.prototype.toggle = function(id, isExpand){
	var rData = this._getRowData(id);
	if(rData != undefined){
		isExpand = isExpand || !rData.isExpand;
		isExpand ? this.expand(id, id) : this.collapse(id, id);
	}
};

oTreeTable.prototype.expand = function(id, aid){
	if(this._getRowData(id) == undefined){
		return false;
	}
	if(aid == undefined){
		aid = id;
	}
	var arr = this._getParentChild(id);
	for(var i=1,c=arr.length; i<c; i++){
		var rData = this._getRowData(arr[i]);
		if(rData != undefined && !rData.isDisplay){
			var row = this._getRowObj(arr[i]);
			if(row != null){
				row.style.display = '';
				this._setRowDisplay(arr[i], true);
			}
		}
		if(rData.hasChild && rData.isExpand){
			this.expand(arr[i], aid);
		}
	}
	this._getRowData(aid).isExpand = true;
	this._setSwitch(aid);
	if(this.config.showIcon){
		this._setIcon(aid);
	}
};

oTreeTable.prototype.collapse = function(id, aid){
	if(this._getRowData(id) == undefined){
		return false;
	}
	if(aid == undefined){
		aid = id;
	}
	var arr = this._getParentChild(id);
	for(var i=1,c=arr.length; i<c; i++){
		var rData = this._getRowData(arr[i]);
		if(rData != undefined && rData.isDisplay){
			var row = this._getRowObj(arr[i]);
			if(row != null){
				row.style.display = 'none';
				this._setRowDisplay(arr[i], false);
			}
		}
		if(rData.hasChild){
			this.collapse(arr[i], aid);
		}
	}
	this._getRowData(aid).isExpand = false;
	this._setSwitch(aid);	
	if(this.config.showIcon){
		this._setIcon(aid);
	}
};

oTreeTable.prototype.openLevel = function(level){
	this.expandLevel(level, this);
};

oTreeTable.prototype.expandLevel = function(level, _){
	if(typeof _ == 'undefined'){
		_ = this;
	}
	if(!_.completed){
		window.setTimeout(function(){_.expandLevel(level, _);}, 100);
		return false;
	}
	level = _._checkLevel(level);
	//展开到某一级
	
	for(var i in _.arrRowData){
		var rData = _.arrRowData[i];
		//有时层级不是从0开始的，需要将层级转换到从0开始，这里假设层级都是连续的
		var curLevel = Math.abs(_.topLevel - rData.level);
		
		if(curLevel <= level + 1){
			if(!rData.isDisplay){
				_._setDisplay(rData, true);
			}
		} else {
			if(rData.isDisplay && rData.level > _.topLevel){
				_._setDisplay(rData, false);
			}
		}
		if(curLevel < level + 1){
			if(rData.hasChild && !rData.isExpand){
				_._setChildDisplay(rData, true);
			}
		} else {
			_._setChildDisplay(rData, false);
		}
		/*
		if(rData.level <= level + 1){
			if(!rData.isDisplay){
				_._setDisplay(rData, true);
			}
		} else {
			if(rData.isDisplay && rData.level > _.topLevel){
				_._setDisplay(rData, false);
			}
		}
		if(rData.level < level + 1){
			if(rData.hasChild && !rData.isExpand){
				_._setChildDisplay(rData, true);
			}
		} else {
			_._setChildDisplay(rData, false);
		}
		*/
	}
};

oTreeTable.prototype.openAll = function(){
	this.expandAll(this);
};

oTreeTable.prototype.expandAll = function(_){
	if(typeof _ == 'undefined'){
		_ = this;
	}
	if(!_.completed){
		window.setTimeout(function(){_.expandAll(_);}, 100);
		return false;
	}

	for(var i in _.arrRowData){
		var rData = _.arrRowData[i];
		if(!rData.isDisplay){
			_._setDisplay(rData, true);
		}
		if(rData.hasChild && !rData.isExpand){
			_._setChildDisplay(rData, true);
		}
	}
};

oTreeTable.prototype.closeAll = function(){
	this.collapseAll(this);
};

oTreeTable.prototype.collapseAll = function(_){
	if(typeof _ == 'undefined'){
		_ = this;
	}
	if(!_.completed){
		window.setTimeout(function(){_.collapseAll(_);}, 100);
		return false;
	}

	for(var i in _.arrRowData){
		var rData = _.arrRowData[i];
		if(rData.isDisplay && rData.level > _.topLevel){
			_._setDisplay(rData, false);
		}
		if(rData.hasChild && rData.isExpand){
			_._setChildDisplay(rData, false);
		}
	}
};

oTreeTable.prototype._checkLevel = function(level){
	if(typeof level != 'number'){
		level = -1;
	} else {
		if(level > this.maxLevel){
			level = this.maxLevel;
		}
	}
	return level;
};

oTreeTable.prototype._setDisplay = function(rData, isShow){
	var row = this._getRowObj(rData.id);
	if(row != null){
		row.style.display = isShow ? '' : 'none';
		this._setRowDisplay(rData.id, isShow);
	}
};

oTreeTable.prototype._setChildDisplay = function(rData, isExpand){
	this._getRowData(rData.id).isExpand = isExpand;
	this._setSwitch(rData.id);
	if(this.config.showIcon){
		this._setIcon(rData.id);
	}
};

oTreeTable.prototype._setSwitch = function(id){
	var sa = this._getSwitchObj(id);
	var rData = this._getRowData(id);
	if(sa != null){
		sa.src = rData.isExpand ? sa.src.replace('plus.gif','minus.gif') : sa.src.replace('minus.gif','plus.gif');
	}
};

oTreeTable.prototype.quickSort = function(arr){
	if (0 == arr.length){
		return [];
	}
	var left = [];
	var right = [];
	var pivot = arr[0];
	for (var i = 1, c=arr.length; i < c; i++) {
		arr[i].level < pivot.level ? left.push(arr[i]) : right.push(arr[i]);
	}
	return this.quickSort(left).concat(pivot, this.quickSort(right));
};

oTreeTable.prototype.setRowNumber = function(cellIndex, rowIndex){
	if(!this.completed){
		window.setTimeout(this._setRowNumber, 100, this.tbObj, cellIndex, rowIndex);
	} else {
		this._setRowNumber(this.tbObj, cellIndex, rowIndex);
	}
};

oTreeTable.prototype._setRowNumber = function(tb, cellIndex, rowIndex){
	for (var i = rowIndex, c = tb.rows.length; i < c; i++) {
		tb.rows[i].cells[cellIndex].innerHTML = (i + 1 - rowIndex);
	}
};