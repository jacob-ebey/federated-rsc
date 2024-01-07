import { type Params } from "framework";

import { Counter } from "../../components/counter";

export async function Component({ params }: { params: Params<"*"> }) {
  const query = params["*"];

  if (!query) throw new Error("No query provided");

  const url = new URL(
    "http://api.weatherapi.com/v1/current.json?key=af6582e99cc74f78972230710240501"
  );
  url.searchParams.append("q", query);

  const weather = await fetch(url.href).then((response) => response.json());

  return (
    <div className="bg-white shadow-2xl p-6 rounded-2xl border-2 border-gray-50 w-full bg-blue-500">
      <div className="flex flex-col">
        <div>
          <h2 className="font-bold text-gray-600 text-center">
            {weather.location.name}, {weather.location.region}
          </h2>
        </div>
        <div className="my-6">
          <div className="flex flex-row space-x-4 items-center">
            <div>
              <span>
                <img
                  className="w-20 h-20"
                  alt={weather.current.condition.text}
                  src={weather.current.condition.icon}
                />
              </span>
            </div>
            <div id="temp">
              <h4 className="text-4xl">{weather.current.temp_c}&deg;C</h4>
              <p className="text-xs text-gray-500">
                Feels like {weather.current.feelslike_c}&deg;C
              </p>
            </div>
          </div>
        </div>
        {/* <div className="w-full place-items-end text-right border-t-2 border-gray-100 mt-2">
          <a href="#" className="text-indigo-600 text-xs font-medium">
            View more
          </a>
        </div> */}
      </div>

      <Counter />
    </div>
  );
}

Component.api = true;
