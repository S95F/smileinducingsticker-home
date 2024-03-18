


export function scrollTo(x,y,expBehavior = 'smooth') {
	var offset = y * window.innerHeight;
	var offsetx = x * window.innerWidth;
    const fixedOffset = offset.toFixed();
    const fixedOffsetx = offsetx.toFixed();
    const onScroll = function () {
            if (window.pageYOffset.toFixed() === fixedOffset && window.pageXOffset.toFixed() === fixedOffsetx) {
                window.removeEventListener('scroll', onScroll)
				
            }
        }

    window.addEventListener('scroll', onScroll);
    onScroll();
    window.scroll({
			top:y * window.innerHeight,
			left:x * window.innerWidth,
			behavior:expBehavior
	});
}


var divs = document.getElementsByClassName("col");
var scrollLock = {x:0,y:0}

export function onResize(){
	dotheSlide(scrollLock.x,scrollLock.y);
}


function classThem(){
	for(var i = 0; i < divs.length; i++){
		divs[i].classList.add("slide");
	}
}
function declassThem(cb=null){
	for(var i = 0; i < divs.length; i++){
		divs[i].classList.remove("slide");
	}
	if(cb!=null){
		setTimeout(cb(),2000);
	}
}

function setPos(cb=null){
	var left = document.documentElement.style.getPropertyValue('--farLeft');
	var top = document.documentElement.style.getPropertyValue('--farTop');
	for(var i = 0; i < divs.length; i++){
		divs[i].style.left = left;
		divs[i].style.top = top;
	}
	if(cb!=null){
		declassThem(cb);
	}else{
		declassThem();
	}
	
}

export function dotheSlide(x,y,cb=null){
	scrollLock.x = x;
	scrollLock.y = y;
	var fleft = document.documentElement.style.getPropertyValue('--farLeft');
	var nfleft = x * -100;
	nfleft = nfleft.toString() + 'vw';
	if(fleft == ''){
		fleft = '0'
	}

	document.documentElement.style.setProperty('--cur', fleft);
	document.documentElement.style.setProperty('--farLeft',nfleft);
	
	var ftop = document.documentElement.style.getPropertyValue('--farTop');
	var nftop = y * -100;
	nftop = nftop.toString() + 'vh';
	if(ftop == ''){
		ftop = '0'
	}
	
	document.documentElement.style.setProperty('--tcur', ftop);
	document.documentElement.style.setProperty('--farTop',nftop);
	classThem();
	if(cb==null){
		divs[0].addEventListener("animationend", function(){setPos();}, false);
	}
	else{
		divs[0].addEventListener("animationend", function(){setPos(cb);}, false);
	}
}
