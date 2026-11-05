import { afterEach, expect, it, vi } from 'vitest';
import { getAdminAttempts } from './admin';
afterEach(()=>vi.unstubAllGlobals());
it('maps phone and searches using the authenticated admin endpoint',async()=>{
 const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({attempts:[{phone:'01000000000'},{phone:null}],total:2,page:1,per_page:50})});
 vi.stubGlobal('fetch',fetch);
 const data=await getAdminAttempts({search:'010-0000-0000'});
 expect(data.attempts.map(a=>a.phone)).toEqual(['01000000000',null]);
 expect(fetch.mock.calls[0][0]).toContain('/api/v1/admin/attempts?search=010-0000-0000');
 expect(fetch.mock.calls[0][1]).toMatchObject({credentials:'include'});
});
