import assert from 'assert';
import * as fs from 'fs';
import { execSync } from 'child_process';

process.chdir('test/test_resources');

it('Should build page_1.mjs as page_1/index.js', () => {
    execSync(`node ../../template-literals.mjs --config config_1.yml --outdir ./test_out --indexes page_1.mjs`)
    assert.ok(fs.existsSync('test_out/page_1/index.html'));
});

it('Should build page_1.mjs and output should equal expected', () => {

    execSync(`node ../../template-literals.mjs --config config_1.yml --outdir ./test_out page_1.mjs -- env=dev projects.0.title="The Best Project" projects.0.figures='{"sales_1mo":
"/images/sales_1mo.png","sales_3mo":"/images/sales_3mo.png"}'`)
    const page_1 = fs.readFileSync('test_out/page_1.html', 'utf8').replace(/  /g,'').trim();
    const page_1_expected = fs.readFileSync('page_1_expected.html', 'utf8').replace(/  /g,'').trim();
    assert.equal(page_1, page_1_expected);
});


