import i18n from "@/i18n/init";
import k from "./../i18n/keys";
import React, { useState, useEffect } from "react";
import "./loading.css";
import { ThreeDots } from "react-loader-spinner";

interface LoadingAnimationProps {
  text?: string;
  size?: "text-sm" | "text-md";
}

export const LoadingAnimation: React.FC<LoadingAnimationProps> = ({
  text,
  size,
}) => {
  const [dots, setDots] = useState("...");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prevDots) => {
        switch (prevDots) {
          case ".":
            return "..";
          case "..":
            return "...";
          case "...":
            return ".";
          default:
            return "...";
        }
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="loading-animation flex">
      <div className={"mx-auto flex" + size ? ` ${size}` : ""}>
        {text === undefined ? i18n.t(k.THINKING) : text}
        <span className="dots">{dots}</span>
      </div>
    </div>
  );
};

export const ThreeDotsLoader = () => {
  return (
    <div className="flex my-auto">
      <div className="mx-auto">
        <ThreeDots
          height="30"
          width="50"
          color="#3b82f6"
          ariaLabel="grid-loading"
          radius="12.5"
          wrapperStyle={{}}
          wrapperClass=""
          visible={true}
        />
      </div>
    </div>
  );
};
