#!env python

#
# pack files/dirs into a zip, for example:
#   python pack_zip.py out.zip dir1 file2
# files are added at the archive root;
# directories are added recursively under their basename
#

import sys
import os
import zipfile

if len(sys.argv) < 3:
    print('usage: %s <output.zip> <file-or-dir>...' % sys.argv[0])
    exit(1)

out_path = sys.argv[1]
inputs = sys.argv[2:]

for item in inputs:
    if not os.path.exists(item):
        print('input %s notfound' % item)
        exit(1)

with zipfile.ZipFile(out_path, 'w', zipfile.ZIP_DEFLATED) as z:
    for item in inputs:
        if os.path.isfile(item):
            z.write(item, os.path.basename(item))
        else:
            base = os.path.basename(os.path.normpath(item))
            for root, dirs, files in os.walk(item):
                for f in files:
                    full = os.path.join(root, f)
                    rel = os.path.join(base, os.path.relpath(full, item))
                    z.write(full, rel)

print('Output File: %s' % out_path)
