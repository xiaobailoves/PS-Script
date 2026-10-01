#!/bin/bash

program_exists() {
    for program in $*; do
        command -v $program >/dev/null 2>&1
        [ $? -ne 0 ] && {
            echo "missing command $program"
            return 1
        }
    done

    return 0
}

show_usage() {
    echo "Usage: $0 <version>"
    echo "  version:\tlike 1.6.0"
    exit 1
}

if [ $# -lt 1 ]; then
    echo "error: Please input release version!"
    show_usage
fi

version=$1
program_exists git python
[ $? -ne 0 ] && exit 1

cd "${0%%/*}"

# Determine if git working space clean
if [ -n "$(git status --untracked-files=no --porcelain | grep -v CHANGELOG.md)" ]; then
    echo "git working space not clean"
    exit 1
fi

# remind
echo "Check List:"
read -p "* Is CHANGELOG.md ready to release? [y/N] " -n1 try;
[ "${try##y}" != "" ] && exit 0

printf "\nstart...\n"

# update version
sed -i "s/\"[0-9][0-9.]*\"/\"${version}\"/" ./src/version.ts

# build
./build.sh

# update changelog: date the [Unreleased] section
date=$(date +%Y-%m-%d)
sed -i "s/^## \[Unreleased\]/## \[${version}\] - ${date}/" CHANGELOG.md

# pack release zip (same layout as published assets:
# LabelPlus_Ps_Script.jsx + ps_script_res)
python ./pack_zip.py build/LabelPlus_PS-Script_${version}.zip \
    build/LabelPlus_Ps_Script.jsx \
    build/ps_script_res

# insert a fresh [Unreleased] section
TMP_HEADER=build/.changelog_header.tmp
printf '\n## [Unreleased]\n### Added\n### Changed\n### Fixed\n### Removed\n\n' > ${TMP_HEADER}
sed -i "1r ${TMP_HEADER}" CHANGELOG.md
rm -f ${TMP_HEADER}

# git commit, add tag
git commit -am "v${version}"
git tag ${version}

cat <<END

=============================
complete!
please check and push new commit & tag, command:
git push
git push origin ${version}

then create a GitHub release (title like "V${version} (魔改版本)")
and upload build/LabelPlus_PS-Script_${version}.zip
END
