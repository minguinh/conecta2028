import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Button} from '../src/components/ui/button';
test('server-rendered actions cannot submit or lose clicks before handlers hydrate; native links remain usable',()=>{
 const action=renderToStaticMarkup(createElement(Button,{type:'submit'},'Cadastrar'));
 assert.match(action,/disabled=""/);assert.match(action,/aria-busy="true"/);
 const link=renderToStaticMarkup(createElement(Button,{asChild:true},createElement('a',{href:'/contatos'},'Contatos')));
 assert.match(link,/href="\/contatos"/);assert.doesNotMatch(link,/disabled=""|aria-busy="true"/);
});
