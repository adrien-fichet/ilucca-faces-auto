# Resize all png images in the screenshot directory to 261x260, without modifying the ratio (extend with black pixels instead)
# imagemagick (convert utility) has to be installed
cd screenshots
find . -name '*.png' -print0 | while read -d $'\0' screenshot; do 
    convert "$screenshot" -resize 261x260 -background Black -gravity center -extent 261x260 "$screenshot";
done
cd ..
