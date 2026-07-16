import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Module } from '@nestjs/common';
import { ACL } from 'apcore-js';
import { ApcoreModule } from 'nestjs-apcore';
import { OrdersModule } from './orders.module.js';

// Load the demo ACL explicitly by absolute path so enforcement does not depend
// on the process working directory (ACL.discover() reads apcore.yaml from CWD).
const here = dirname(fileURLToPath(import.meta.url));
const acl = ACL.load(join(here, 'acl.yaml'));

@Module({
  imports: [ApcoreModule.forRoot({ acl }), OrdersModule],
})
export class AppModule {}
