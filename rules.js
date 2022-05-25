const fancyParser = require('./fancyParser')

class Rule {
    
    constructor() {
        if(this.constructor === Rule) {
            throw new Error('Cannot Instantiate abstract class "Rule"!');
        }
    }
    
    static create() {
        return new this(...arguments)
    }
    
    matches(url) {
        throw new Error('Cannot call abstract method "matches"!');
    }
    
    get stopProcessing() { return true; }
    
    get countsAsResponse() { return true; }
    
    apply(req, res) {
        throw new Error('Cannot call abstract method "apply"!');
    }
    
}

class MatchRule extends Rule {
    
    #matchRules = [];
    
    #doesMatch(url, rule, req)
    {
        if(typeof(rule) == 'string') {
            return url == rule
        } else if(rule instanceof RegExp) {
            return url.match(rule) != null
        } else if(typeof(rule) == 'function') {
            return rule(url, req) == true
        }
    }
    
    addMatch(match) {
        let type = typeof(match);
        if(type == 'string' || match instanceof RegExp || type == 'function') {
            if(type == 'string' && match.includes('*')) {
                let regex = ''
                let lit = false
                let escaped = match.replace(/[.+^${}()|[\]\\]/g, '\\$&')
                for(let char of escaped) {
                    if(lit) {
                        lit = false
                        if(char != '*') {
                            regex += '\\'
                        }
                        regex += char
                        continue
                    }
                    if(char == '\\') {
                        lit = true;
                        continue
                    }
                    if(char == '*') {
                        regex += '.*'
                        continue
                    }
                    regex += char
                }
                console.log(match, regex)
                this.#matchRules.push(new RegExp(regex))
            } else {
                this.#matchRules.push(match)
            }
        } else {
            throw new Error('Invalid Match Type \"' + typeof(match) + '\"!');
        }
        return this;
    }
    
    addMatches(matches) {
        if(matches instanceof Array && matches.length > 0) {
            for(let match of matches) {
                this.addMatch(match)
            }
        }
    }
    
    matches(url, req) {
        for(let rule of this.#matchRules) {
            if(this.#doesMatch(url, rule, req)) {
                return true;
            }
        }
        return false;
    }
    
    constructor() {
        super()
        if(this.constructor === MatchRule) {
            throw new Error('Cannot Instantiate abstract class "MatchRule"!');
        }
    }
}

class RawRule extends MatchRule {
    
    #func;
    
    constructor(func) {
        super()
        if(typeof(func) == 'function') {
            this.#func = func;
        } else {
            throw new Error('A valid function is needed when instantiating a RawRule!');
        }
    }
    
    apply(req, res) {
        this.#func(req, res)
    }
}

class IgnoreRule extends MatchRule {
    constructor(matches) {
        super()
        this.addMatches(matches)
    }
    
    get countsAsResponse() { return false; }
    
    apply(req, res) {}
}

class RedirectRule extends RawRule {
    constructor(location, matches) {
        super(function(req, res) {
            let newUrl = null
            if(typeof(location) == 'string') {
                newUrl = location
            } else if(typeof(location) == 'function') {
                newUrl = location(req.url).toString()
            }
            if(newUrl != null && newUrl != req.url) {
                res.writeHead(307, {'Location': newUrl})
                res.end()
            } else {
                passThroughRequest(req, res)
            }
        })
        this.addMatches(matches)
    }
}

class SkippableRule extends RawRule {
    
    #countsAsResponse;
    
    constructor() {
        super(...arguments)
    }
    
    get countsAsResponse() { return this.#countsAsResponse; }
    
    set countsAsResponse(countsAsResponse) {
        this.#countsAsResponse = countsAsResponse;
    }
    
    getCountsAsResponse() { return this.#countsAsResponse; }
    
    setCountsAsResponse(countsAsResponse) {
        this.#countsAsResponse = countsAsResponse;
        return this;
    }
}

class RewriteRule extends SkippableRule {
    constructor(location, matches) {
        super(function(req, res) {
            let newUrl = null
            if(typeof(location) == 'string') {
                newUrl = location
            } else if(typeof(location) == 'function') {
                newUrl = location(req.url).toString()
            }
            if(newUrl != null) {
                let old = fancyParser.url.parse(req.url)
                //load any backups from the previous url, such as auth or host or protocol
                let now = fancyParser.url.resolveObject(old, fancyParser.url.parse(newUrl))
                req.url = fancyParser.url.format(now)
                if(fancyParser.toLowerCase(old.host) != fancyParser.toLowerCase(now.host)) {
                    req.headers.host = fancyParser.toLowerCase(now.host)
                }
            }
        })
        this.setCountsAsResponse(false);
        this.addMatches(matches)
    }
}

module.exports = {Rule, MatchRule, RawRule, IgnoreRule, RedirectRule, SkippableRule, RewriteRule}