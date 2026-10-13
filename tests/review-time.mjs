import assert from 'node:assert/strict';
import {timeline,pointAt,pointFraction,speedAt} from '../src/reviewTime.js';
const points=[{coordinates:[0,0],time:1000,speed:30,segment:0},{coordinates:[.00001,0],time:1100,speed:40,segment:0},{coordinates:[.00002,0],time:10000,speed:50,segment:1}];
assert.equal(timeline(points).duration,9);assert.equal(pointAt(points,.5).index,1);assert.equal(pointAt(points,1).index,2);assert.equal(pointFraction(points,1),.1/9);assert.equal(speedAt(points,0).value,30);
assert.equal(timeline([{time:1000},{time:1000},{time:2000}]).timed,true);
assert.equal(timeline([{time:null},{time:2000}]).timed,false);assert.equal(timeline([{time:2000},{time:1000}]).timed,false);
assert.equal(speedAt([{coordinates:[0,0],time:1000,segment:0},{coordinates:[.001,0],time:2000,segment:1}],1).value,null);
console.log('Common GPS clock, uneven timing, duplicated samples, missing dates and segment gaps PASS');
