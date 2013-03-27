var input = [], command = -1;
// 38 up
// 40 down

$(document).ready(function() {
	addReturnListener();
	addUpDownListener();
	activateTabs();
	addTerminalListener();
	$('#input').focus();
});

var addTerminalListener = function() {
	$(".terminal").click(function() {
		$("#input").focus();
	});
}

var addReturnListener = function() {
	var str, alist;

	$("#input").keydown(function(event) {
		$(".terminal").scrollTop($(".terminal")[0].scrollHeight);	

		if (event.keyCode == 13) {
			str = removeWhiteSpace($("#input").val());

			if (str) {
				input.unshift(str);
				alist = parse(input[0]);
			}

			if (alist)
				alist = eval(alist);
			if (alist)
				alist = unparse(alist);
			if (alist)
				$("#output").append('<div>sjsu> ' + input[0] + '<br><span class=text-success>' + alist + '</span></div><br>');
			
			resetInput();
			$(".terminal").scrollTop($(".terminal")[0].scrollHeight);
		}
	});
};

var addUpDownListener = function() {
	$("#input").keydown(function(event) {
		if (event.keyCode == 38 && input.length > 0) {
			command++;
			if (command >= input.length)
				command = 0;
			$("#input").val(input[command]);
		} 
		else if (event.keyCode == 40 && input.length > 0) {
			command--;
			if (command < 0)
				command = input.length - 1;
			$("#input").val(input[command]);
		}
	});
};

var resetInput = function() {
	$("#input").val("").focus();
	command = -1;
};

var showError = function(error) {
	$("#parse").text("");
	$("#eval").text("");
	$("#output").append('<div>sjsu> ' + input[0] + "<br><span class='text-error'>ERROR: " + error.message + '<span></div><br>');
	$("#output").scrollTop($("#output")[0].scrollHeight);
	$("#input").val("").focus();
	command = -1;
};

var refreshVars = function() {
	$("#vars").text(jsonToString(symbolTable, ''));
};

var removeWhiteSpace = function(str) {
	var start = 0, end = str.length - 1;

	if (/^\s*$/.test(str)){
		return false;
	}
	else {
		while (/\s/.test(str.charAt(start)))
			start++;

		while (/\s/.test(str.charAt(end))) 
			end--;

		return str.slice(start, end + 1);
	}
};

var activateTabs = function() {
	$('#tabs a').click(function (e) {
	  e.preventDefault();
	  $(this).tab('show');
	})
}

/************************ PARSER ****************************/
var keywords = [ 'cons', 
								 'car', 
								 'cdr', 
								 'list', 
								 'quote',  
								 'def', 
								 'if', 
								 'lambda' ],
		symbols = [ '+', 
								'-', 
								'*', 
								'/', 
								'<', 
								'>', 
								'=',
								'<=', 
								'>=',
								'or',
								'and' ],
		symbolTable = { typ: 'nil' }, parenthesis, addParen, addSpace;

var parse = function (line) {
	var tokens = [], alist = {};
	parenthesis = 0;

	try {
		if (!line || (/^\s+$/).test(line))
			return null;

		tokens = tokenize(line);
		alist = createAlist(tokens);
		$("#parse").text(jsonToString(alist, ''));
		return alist;
	}
	catch (error) {
		console.log("ERROR: " + error.message);
		showError(error);
	}
};


var unparse = function(alist) {
	addParen = true;
	addSpace = false;
	return unparseAlist(alist);	
}

var eval = function(alist) {
	try {
		var result = evalAlist(alist, null);
		
		if (result.typ == 'lambda' && result.formals) 
			result = { typ: 'lambda', val: unparseLambda(alist.val, result.formals) };
		
		$("#eval").text(jsonToString(result, ''));
		return result;
	}
	catch (error) {
		console.log('ERROR: ' + error.message);
		showError(error);
	}
}

///********************************************************************/
///*											HELPER FUNCTIONS FOR parse()		 						*/
///********************************************************************/

/* Splits line into an array of tokens and returns it. */
var tokenize = function(input) {
	var tokens = [], str, line, multiline;

	input = input.split("\n");
	multiline = input.length > 1;

	for (var j = 0; j < input.length; j++) {
		line = input[j];

		if (line.charAt(0) != '(' && !multiline) {
			tokens.push(line.split(' ')[0]);
			return tokens;
		}

		for (var i = 0; i < line.length; i++) {
			if (line.charAt(i) == "(") {
				if (line.charAt(i + 1) == ")") {
					tokens.push("()");
					i++;
				}
				else {
					tokens.push("(");
					parenthesis++;
				}	
			} 
			else if (line.charAt(i) == ")") {
				tokens.push(")");
				parenthesis--;
			}
			else if (line.charAt(i) == "\"") {
				str = line.charAt(i++);
				
				while (line.charAt(i) != "\"" && i < line.length) 
					str += line.charAt(i++);

				if (line.charAt(i) == '\"')
					str += "\"";

				tokens.push(str);
			} 
			else if (line.charAt(i) != " " && line.charAt(i) != "\t") {
				str = "";
				
				while (["(", ")", " ", "\t"].indexOf(line.charAt(i)) < 0 && i < line.length)
					str += line.charAt(i++);
				
				tokens.push(str);
				
				if (line.charAt(i) == "(") {
					tokens.push("(");
					parenthesis++;
				}
				else if (line.charAt(i) == ")") {
					tokens.push(")");
					parenthesis--;
				}
			}
		}
	}
	if (parenthesis == 0)
		return tokens;
	else
		throw new Error("Uneven parenthesis.");
};

/* Creates an association list from array or tokens. */
var createAlist = function(tokens) {
	var token, array = [];

	if (tokens.length == 1 && parenthesis == 0) {
		return parseToken(tokens.shift());
	}
	else {
		token = tokens.shift();

		if (token == '(') {
			parenthesis++;

			if (parenthesis == 1) {
				if (tokens[0] != '(') {
					return { typ: 'cons', 
									 car: parseToken(tokens.shift()), 
									 cdr: createAlist(tokens) };
				}
				else {
					var paren = 1, i = 1, lambda;
					while (paren != 0 && i < tokens.length) {
						if (tokens[i] == '(')
							paren++;
						else if (tokens[i] == ')')
							paren--;
						i++;
					}
					var lambda = tokens.splice(0, i);
					return { typ: 'cons',
									 car: createAlist(lambda).car,
									 cdr: createAlist(tokens) };
				}
			} 
			else { 
				while (tokens[0] != ')') {
					token = tokens.shift();

					if (token == '(') {
						parenthesis++;
						array.push(createAlist(tokens));
					}
					else {
						array.push(token);
					}
				}
					
				array.push(tokens.shift());
				return { typ: 'cons', 
								 car: createAlist(array), 
								 cdr: createAlist(tokens) };
			}
		}
		else if (token == ')' || token == undefined) {
			if (token) parenthesis--;
			return { typ: 'nil' };
		}
		else if (token.typ) {
			return { typ: 'cons', 
							 car: token, 
							 cdr: createAlist(tokens) };
		}
		else {
			return { typ: 'cons', 
							 car: parseToken(token), 
							 cdr: createAlist(tokens) };
		}
	}
}

/* Converts token into JSON. Ex: { typ: "type", val: "value" } */
var parseToken = function(token) {
	if (isNil(token) || token == ')') {
		return { typ: "nil" };
	}
	else if (isString(token)) {
		return { typ: "string", val: token };
	}
	else if (isPrim(token)) {
		return { typ: "prim", val: token };
	}
	else if (isSymbol(token)) {
		return { typ: "symbol", val: token };
	}
	else if (isBoolean(token)) {
		return { typ: "boolean", val: token == "#t" ? 1 : 0 };
	}
	else if (isVariable(token)) {
		return { typ: "var", val: token };
	}
	else if (isFloat(token) || isInteger(token)) {
		return { typ: "number", val: parseNumber(token) };
	}
};

var parseNumber = function(token) {
	if (isFloat(token))
		return parseFloat(token);
	else if (isInteger(token))
		return parseInt(token);
	else
		throw new Error("Invalid number.");
};

var isFloat = function(token) { 
	return /[+-]{0,1}\d*\.\d+/.test(token);
};

var isInteger = function(token) { 
	return /[0-9]+$/.test(token) 
};

var isSymbol = function(token) {
	return symbols.indexOf(token) >= 0;
};

var isString = function(token) { 
	if (token.charAt(0) == '\"' && token.charAt(token.length - 1) == '\"') {
		return true;
	}
	else if (token[0] == '\"' && token[token.length - 1] != '\"') {
		throw new Error("Unclosed quotes.");
	}	

	return false;
};

var isNil = function(token) {
	return token === "()";
};

var isPrim = function(token) {
	return keywords.indexOf(token) >= 0
};

var isVariable = function(token) {
	return /[A-z]+/.test(token);
};

var isBoolean = function(token) {
	return token == "#t" || token == "#f";
};


/********************************************************************/
/*										HELPER FUNCTIONS FOR eval()	 									*/
/********************************************************************/

var evalAlist = function(alist, formals) {
	var result = {};

	if (alist.typ != 'cons') {
		result = evalSimpleAlist(alist, formals)	;
	}
	else if (alist.car.typ == 'prim') {
		switch (keywords.indexOf(alist.car.val)) {
			case 0: // 'cons'
				result = cons(alist.cdr, formals);
				break;
			case 1: // 'car'
				result = car(alist.cdr, formals);
				break;
			case 2: // 'cdr'
				result = cdr(alist.cdr, formals);
				break;
			case 3: // 'list'
				result = list(alist.cdr, formals);
				break;
			case 4: // 'quote'
				result = quote(alist.cdr);
				break;
			case 5: // 'def'
				result = def(alist.cdr);
				break;
			case 6: // 'if'
				result = ifelse(alist.cdr, formals);
				break;
			case 7: // 'lambda'
				result = lambda(alist.cdr);
				break;
		}
	}
	else if (alist.car.typ == 'symbol') {
		switch (symbols.indexOf(alist.car.val)) {
			case 0: // '+'
				result = { typ: 'number', val: plus(alist.cdr, formals) };
				break;
			case 1: // '-'
				result = { typ: 'number', val: minus(alist.cdr, formals)}; 
				break;
			case 2: // '*'
				result = { typ: 'number', val: multiply(alist.cdr, formals)};
				break;
			case 3: // '/'
				result = { typ: 'number', val: divide(alist.cdr, formals)};
				break;
			case 4: // '<'
				result = { typ: 'boolean', val: less(alist.cdr, formals) ? '#t' : '#f' };
				break;
			case 5: // '>'
				result = { typ: 'boolean', val: greater(alist.cdr, formals) ? '#t' : '#f' };
				break;
			case 6: // '='
				result = { typ: 'boolean', val: equal(alist.cdr, formals) ? '#t' : '#f' };
				break;
			case 7: // '<='
				result = { typ: 'boolean', val: lessOrEquals(alist.cdr, formals) ? '#t' : '#f'};
				break;
			case 8: // '>='
				result = { typ: 'boolean', val: greaterOrEquals(alist.cdr, formals) ? '#t' : '#f'};
				break;
			case 9: // 'or'
				result = or(alist.cdr, formals);
				break;
			case 10: // 'and'
				result = and(alist.cdr, formals);
				break;
		}
	}
	else if (alist.car.typ == 'var') {
		var variable = lookUp(alist.car, formals), temp;

		if (variable.typ == 'lambda')
			temp = { typ: 'cons',
										car: alist.car,
										cdr: variable };
		else 
			temp = variable;

		temp = { typ: 'cons',
						 car: temp,
						 cdr: alist.cdr };

		if (temp.car.typ == 'cons' && alist.cdr.typ != 'nil')
			result = evalLambda(temp, formals);
		else 
			result = evalAlist(temp, formals);
	}
	else if (alist.car.car && alist.car.car.val == 'lambda') {
		var temp = { typ: 'cons', car: { typ: 'var', val: 'anonymous'}, cdr: lambda(alist.car.cdr) };
		temp = { typ: 'cons',
						 car: temp,
						 cdr: alist.cdr};
		result = evalLambda(temp, formals);
	}

	return result;
}

var evalSimpleAlist = function(alist, formals) {
	var result = alist;

	if (alist.typ == 'nil') {
		result.val = '()';
	}
	else if (alist.typ == 'var') {
			result = lookUp(alist, formals);
	}
	/*
	else if (['if', 'def', 'lambda', 'or', 'and'].indexOf(alist.val) >= 0) {
		result.val = '<macro ' + alist.val + '>';
	}
	else if (alist.typ == 'var') {
		result = lookUp(alist);

		if (result.typ == 'lambda')
			result = { typ: 'lambda', 
								 val: unparseLambda(alist.val, result.formals) };
	}
	else if (alist.typ == 'lambda') {
		result.val = unparseLambda(null, result.formals);
	}
	else if (alist.typ == 'prim' || alist.typ == 'symbol') {
		result.val = '<procedure ' + alist.val + '>';
	}*/
	else if (alist.typ == 'boolean') {
		result.val = alist.val == 1 ? "#t" : "#f";
	}
	else {
		result.val = alist.val;
	}

	return result;
}

/* Evaluates 'cons' keyword. */
var cons = function(alist, formals) {
	if (alist.typ == 'nil' || alist.cdr.typ == 'nil' || alist.cdr.cdr.typ != 'nil')
		throw new Error("Wrong number of arguments to procedure cons.");

	return { typ: 'cons',
					 car: evalAlist(alist.car, formals),
					 cdr: evalAlist(alist.cdr.car, formals) };
}

/* Evaluates 'car' keyword. */
var car = function(alist, formals) {
	if (alist.typ == 'nil') 
		throw new Error("Wrong argument type: " + alist.typ + " (expecting pair).");

	var result = evalAlist(alist.car, formals);

	if (result.typ != 'cons')
		throw new Error("Wrong argument type: " + result.typ + " (expecting pair).");

	return result.car;
}

/* Evaluates 'cdr' keyword. */
var cdr = function(alist, formals) {
	if (alist.typ == 'nil') 
		throw new Error("Wrong argument type: " + alist.typ + " (expecting pair).");

	var result = evalAlist(alist.car, formals);

	if (result.typ != 'cons')
		throw new Error("Wrong argument type: " + result.typ + " (expecting pair).");

	return result.cdr;
}

/* Evaluates 'list' keyword. */
var list = function(alist, formals) {
	if (alist.typ == 'nil') {
		return evalAlist(alist, formals);
	}
	else {
		return { typ: 'cons',
						 car: evalAlist(alist.car, formals),
						 cdr: list(alist.cdr, formals) };
	}
}

/* Evaluates 'quote' keyword. */
var quote = function(alist) {
	if (alist.typ == 'nil') 
		throw new Error("Invalid syntax around procedure quote.");
	else if (alist.car.val != 'cons' && alist.cdr.typ != 'nil')
		throw new Error("Invalid syntax around procedure quote.");
	
	return alist.car;
}

/* Evaluates 'def' keyword. */
var def = function(alist) {
	if (alist.typ == 'nil') 
		throw new Error("Invalid syntax around macro def.");

	var variable = { typ: 'cons',
					 				 car: alist.car,
					 			   cdr: evalAlist(alist.cdr.car, null) };

	addVariable(variable);

	if (variable.cdr.typ == 'lambda')
		return { typ: 'lambda', val: unparseLambda(variable.car.val, variable.cdr.formals) };
	else
		return variable.cdr;
}

/* Evaluates 'if' keyword. */
var ifelse = function(alist, formals) {
	if (alist.typ == 'nil' || alist.car.typ == 'nil' || alist.cdr.typ == 'nil') 
		throw new Error("Invalid syntax around macro if.");

	var cond = evalAlist(alist.car, formals);

	if (cond.typ == 'boolean' && cond.val == '#f') {
		if (alist.cdr.cdr && alist.cdr.cdr.typ != 'nil')
			return evalAlist(alist.cdr.cdr.car, formals); // cond is false AND else clause exists
		else
			return null; // else clause does not exist
	}
	else {
		return evalAlist(alist.cdr.car, formals); // cond is true
	}
}

/* Evalutes 'lambda' keyword. */
var lambda = function(alist) {
	return { typ: 'lambda', 
					 formals: alist.car,
					 body: alist.cdr };
}

var evalLambda = function(alist, formals) {
	if (countParams(alist.car.cdr.formals) == countParams(alist.cdr)) {
		var formals = bindParams(alist.car.cdr.formals, alist.cdr, formals);
		var body = alist.car.cdr.body.car;
		return evalAlist(body, formals);
	}
	else {
		throw new Error('Invalid number of arguments to ' + 
										unparseLambda(alist.car.car.val, alist.car.cdr.formals) + '.');
	}
}

/* Evaluates '+' operation */
var plus = function(alist, formals) {
	var result;

	if (alist.typ != 'nil' && alist.car)
		result = alist.car;

	if (alist.typ == 'nil')
		return 0;
	else if (alist.car.typ == 'var')
		result = lookUp(alist.car, formals);
	else if (alist.car.typ != 'cons' && alist.car.typ != 'number')
		throw new Error('Wrong argument type: ' + alist.car.val + '.');

	if (result.typ == 'number') 
		return result.val + plus(alist.cdr, formals);
	else
		return evalAlist(result, formals).val + plus(alist.cdr, formals);	
}

/* Evaluates '-' operation */
var minus = function(alist, formals) {
	var result;

	if (alist.typ != 'nil' && alist.car)
		result = alist.car;

	if (alist.typ == 'nil')
		return 0;
	else if (alist.car.typ == 'var')
		result = lookUp(alist.car, formals);
	else if (alist.car.typ != 'cons' && alist.car.typ != 'number')
		throw new Error('Wrong argument type: ' + alist.car.val + '.');

	if (result.typ == 'number' && alist.cdr.typ == 'nil')
		return -result.val;
	else if (result.typ == 'number') 
		return result.val - plus(alist.cdr, formals);
	else
		return evalAlist(result, formals).val - plus(alist.cdr, formals);
}

/* Evaluates '*' operation */
var multiply = function(alist, formals) {
	var result;

	if (alist.typ != 'nil' && alist.car)
		result = alist.car;

	if (alist.typ == 'nil')
		return 1;
	else if (alist.car.typ == 'var')
		result = lookUp(alist.car, formals);
	else if (alist.car.typ != 'cons' && alist.car.typ != 'number')
		throw new Error('Wrong argument type: ' + alist.car.val + '.');

	if (result.typ == 'number') 
		return result.val * multiply(alist.cdr, formals);
	else
		return evalAlist(result, formals).val * multiply(alist.cdr, formals);	
}

/* Evaluates '/' operation */
var divide = function(alist, formals) {
	var result;

	if (alist.typ != 'nil' && alist.car)
		result = alist.car;

	if (alist.typ == 'nil')
		return 1;
	else if (alist.car.typ == 'var')
		result = lookUp(alist.car, formals);
	else if (alist.car.typ != 'cons' && alist.car.typ != 'number')
		throw new Error('Wrong argument type: ' + alist.car.val + '.');

	if (result.typ == 'number' && alist.cdr.typ == 'nil')
		return 1 / result.val;
	else if (result.typ == 'number')
		return result.val / multiply(alist.cdr, formals);
	else
		return evalAlist(result, formals).val / multiply(alist.cdr, formals);
}

/* Evaluates '<' operation */
var less = function(alist, formals) {
	var result;

	if (alist.typ != 'nil' && alist.car)
		result = alist.car;

	if (alist.typ == 'nil') {
		return true;
	}
	else if (alist.car.typ == 'var') {
		result = lookUp(alist.car, formals);
	}

	if (result.typ != 'cons' && result.typ != 'number') {
		throw new Error('Wrong argument type: ' + result.val + '.');
	}
	else if (alist.cdr.typ == 'nil') {
		if (result.typ == 'number')
			return result.val;
		else 
			return evalAlist(result, formals).val;
	}
	
	if (result.typ == 'number') {
		if (result.val < less(alist.cdr, formals))
			return result.val;
	}
	else {
		var car = evalAlist(result, formals);

		if (car.val < less(alist.cdr, formals))
			return car.val;
	}
	
	return false;
}

/* Evaluates '>' operation. */
var greater = function(alist, formals) {
	var result;

	if (alist.typ != 'nil' && alist.car)
		result = alist.car;

	if (alist.typ == 'nil') {
		return true;
	}
	else if (alist.car.typ == 'var') {
		result = evalAlist(alist.car, formals);
	}

	if (result.typ != 'cons' && result.typ != 'number') {
		throw new Error('Wrong argument type: ' + result.val + '.');
	}
	else if (alist.cdr.typ == 'nil') {
		if (result.typ == 'number')
			return result.val;
		else 
			return evalAlist(result, formals).val;
	}

	if (result.typ == 'number') {
		var temp = greater(alist.cdr, formals);

		if (temp && result.val > temp)
			return result.val;
		else 
			return false;
	}
	else {
		var car = evalAlist(result, formals);
	
		if (car.val > greater(alist.cdr, formals))
			return car.val;
	}
}

/* Evaluates '=' operation. */
var equal = function(alist, formals) {
	var result;

	if (alist.typ != 'nil' && alist.car)
		result = alist.car;

	if (alist.typ == 'nil') {
		return true;
	}
	else if (alist.car.typ == 'var') {
		result = evalAlist(alist.car, formals);
	}

	if (result.typ != 'cons' && result.typ != 'number') {
		throw new Error('Wrong argument type: ' + result.val + '.');
	}
	else if (alist.cdr.typ == 'nil') {
		if (result.typ == 'number')
			return result.val;
		else 
			return evalAlist(result, formals).val;
	}

	if (result.typ == 'number') {
		var temp = equal(alist.cdr, formals);

		if (temp && result.val == temp)
			return result.val;
		else 
			return false;
	}
	else {
		var car = evalAlist(result, formals);
	
		if (car.val > greater(alist.cdr, formals))
			return car.val;
	}
}

/* Evaluates '<=' operation. */
var lessOrEquals = function(alist, formals) {
	var result;

	if (alist.typ != 'nil' && alist.car)
		result = alist.car;

	if (alist.typ == 'nil') {
		return true;
	}
	else if (alist.car.typ == 'var') {
		result = evalAlist(alist.car, formals);
	}

	if (result.typ != 'cons' && result.typ != 'number') {
		throw new Error('Wrong argument type: ' + result.val + '.');
	}
	else if (alist.cdr.typ == 'nil') {
		if (result.typ == 'number')
			return result.val;
		else 
			return evalAlist(result, formals).val;
	}

	if (result.typ == 'number') {
		var temp = lessOrEquals(alist.cdr, formals);

		if (temp && result.val <= temp)
			return result.val;
		else 
			return false;
	}
	else {
		var car = evalAlist(result, formals);
	
		if (car.val <= lessOrEquals(alist.cdr, formals))
			return car.val;
	}
}

/* Evaluates '>=' operation. */
var greaterOrEquals = function(alist, formals) {
	var result;

	if (alist.typ != 'nil' && alist.car)
		result = alist.car;

	if (alist.typ == 'nil') {
		return true;
	}
	else if (alist.car.typ == 'var') {
		result = evalAlist(alist.car, formals);
	}

	if (result.typ != 'cons' && result.typ != 'number') {
		throw new Error('Wrong argument type: ' + result.val + '.');
	}
	else if (alist.cdr.typ == 'nil') {
		if (result.typ == 'number')
			return result.val;
		else 
			return evalAlist(result, formals).val;
	}

	if (result.typ == 'number') {
		var temp = greaterOrEquals(alist.cdr, formals);

		if (temp && result.val >= temp)
			return result.val;
		else 
			return false;
	}
	else {
		var car = evalAlist(result, formals);
	
		if (car.val >= greaterOrEquals(alist.cdr, formals))
			return car.val;
	}
}

/* Evaluates 'or' operation. */
var or = function(alist, formals) {
	var result;

	if (alist.typ != 'nil' && alist.car)
		result = alist.car;

	if (alist.typ == 'nil') {
		return { typ: 'boolean', val: '#f' };
	}
	
	result = evalAlist(alist.car, formals);
		
	if (result.typ == 'boolean' && result.val == '#f') {
		return or(alist.cdr, formals);
	}
	else {
		return result;
	}
}

/* Evaluates 'and' operation. */
var and = function(alist, formals) {
	if (alist.typ == 'nil') {
		return { typ: 'boolean', val: '#t' };
	}
	
	var result = evalAlist(alist.car, formals);
		
	if (result.typ == 'boolean' && result.val == '#f') {
		return result;
	}
	else {
		if (alist.cdr.typ == 'nil')
			return result;
		else
			return and(alist.cdr, formals);
	}
}

/********************************************************************/
/*										HELPER FUNCTIONS FOR unparse()	 							*/
/********************************************************************/

/* recursively prints alist. */
var unparseAlist = function(alist) {
	var prefix = "";
	
	if (alist.typ == 'lambda' && alist.formals) {
		return unparseLambda(null, alist.formals);
	}
	
	if (alist.typ != 'cons') {
		return alist.val;
	}

	if (addParen) {
		prefix = "(";
		addParen = false;
	}
	
	return prefix + unparseCar(alist.car) + unparseCdr(alist.cdr);
}

var unparseCar = function(alist) {
	var result = "";
	
	if (alist.typ == "cons") {
		if (addSpace)
			result = " (";
		else
			result = "(";

		addSpace = false;
		return result + unparseAlist(alist);
	}
	
	if (addSpace)
		result = " ";

	if (alist.typ == 'boolean')
		result += alist.val == 1 ? "#t" : "#f";
	else
		result += alist.val;

	return result;
}

var unparseCdr = function(alist) {
	var result = "";

	if (alist.typ == "cons") {
		addSpace = true;
		return unparseAlist(alist);
	}
		
	if (alist.typ == 'nil')
		return ')';
	else if (alist.typ == 'boolean')
		result = " . " + (alist.val == 1 ? "#t" : "#f") + ")";
	else
		result = " . " + alist.val + ")";
	
	return result;
}

var unparseLambda = function(name, formals) {
	if (name) 
		return 'procedure ' + name + '(' + unparseLambdaFormals(formals) + ')';
	else
		return 'procedure #f (' +  unparseLambdaFormals(formals) + ')';
}

var unparseLambdaFormals = function(formals) {
	if (formals.cdr.typ == 'nil')
		return formals.car.val;
	else
		return formals.car.val + ' ' + unparseLambdaFormals(formals.cdr);
}

/********************************************************************/
/*												OTHER HELPER FUNCTIONS	 									*/
/********************************************************************/

/* Adds a new variable to symbol table. */
var addVariable = function(variable) {
	symbolTable = { typ: 'cons',
									car: variable,
									cdr: symbolTable };
	refreshVars();
}

/* Looks up a variable in symbol table. */
var lookUp = function(variable, formals) {
	var result;

	if (formals) {
		try {
			result = search(formals, variable);
		}
		catch (error) {
			result = search(symbolTable, variable);
		}
	}
	else {
		result = search(symbolTable, variable);
	}

	return result;
}

/* Recursively searches alist for an element. */
var search = function(alist, variable) {
	if (alist.typ == 'nil')
		throw new Error('Unbound variable: ' + variable.val + '.');

	if (equals(variable, alist.car.car))
		return alist.car.cdr
	else
		return search(alist.cdr, variable);
}

/* Checks if two alists are equal. */
var equals = function(alist1, alist2) {
	return alist1.typ == alist2.typ && alist1.val == alist2.val;
}

/* Converts JSON object to string. */
var jsonToString = function(alist, prefix) {
	if (alist.typ == 'nil') {
		return '{ typ: ' + 
					 alist.typ + 
					 ' }';
	}
	else if (alist.typ == 'lambda') {
		if (alist.formals)
			return '{ typ: lambda, \n' +
						 prefix + '  formals: ' + jsonToString(alist.formals, prefix + '   ') + '\n' +
						 prefix + '  body: ' + jsonToString(alist.body, prefix + '   ') +	
						 ' }';
		else 
			return '{ typ: lambda, val: ' + alist.val + ' }';
	}
	else if (alist.typ != 'cons') {
		return '{ typ: ' + 
					 alist.typ + 
					 ', val: ' + 
					 alist.val + 
					 ' }';
	}
	else {
		return '\n' +
					 prefix +
					 '{ typ: cons,\n' +
					 prefix + '  car: ' + jsonToString(alist.car, prefix + '   ') +
					 '\n' +
					 prefix + '  cdr: ' + jsonToString(alist.cdr, prefix + '   ') +
					 ' }';
	}
}

var countParams = function(alist) {
	if (alist.typ == 'nil')
		return 0;
	else 
		return 1 + countParams(alist.cdr);
}

var bindParams = function(formals, params, _formals) {
	var result = { typ: 'cons', car: '', cdr: '' };

	if (formals.cdr.typ == 'nil') {
		result.car = { typ: 'cons', 
									 car: formals.car,
									 cdr: evalAlist(params.car, _formals) };
		result.cdr = { typ: 'nil' };
	}
	else {
		result.car = { typ: 'cons', 
									 car: formals.car,
									 cdr: evalAlist(params.car, _formals) };
		
		result.cdr = bindParams(formals.cdr, params.cdr, _formals);
	}

	return result;
}